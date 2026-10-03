import { ProtocolError, type JsonValue } from "./types";

export type Schema = boolean | { [key: string]: unknown };
const own = (value: object, key: string) => Object.hasOwn(value, key);
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Reject values that JSON.stringify would drop, coerce or execute. */
export function assertJson(
  value: unknown,
  ancestors = new Set<object>()
): asserts value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (!record(value) && !Array.isArray(value))
    throw new ProtocolError("invalid_message", "Expected JSON data.");
  if (ancestors.has(value)) throw new ProtocolError("invalid_message", "Cyclic JSON data.");
  const prototype = Object.getPrototypeOf(value);
  if (
    Array.isArray(value)
      ? prototype !== Array.prototype
      : prototype !== Object.prototype && prototype !== null
  )
    throw new ProtocolError("invalid_message", "Expected plain JSON data.");
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.getOwnPropertySymbols(value).length)
    throw new ProtocolError("invalid_message", "Unexpected symbol.");
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const descriptor = descriptors[String(i)];
      if (!descriptor || !own(descriptor, "value"))
        throw new ProtocolError("invalid_message", "Sparse or accessor array.");
      assertJson(descriptor.value, ancestors);
    }
    if (Object.keys(descriptors).length !== value.length + 1)
      throw new ProtocolError("invalid_message", "Unexpected array property.");
  } else {
    for (const descriptor of Object.values(descriptors)) {
      if (!descriptor.enumerable || !own(descriptor, "value"))
        throw new ProtocolError("invalid_message", "Unexpected accessor or hidden property.");
      assertJson(descriptor.value, ancestors);
    }
  }
  ancestors.delete(value);
}

/** Object keys use Unicode code-point order; numbers use JSON.stringify. */
export function canonicalJson(value: unknown): string {
  assertJson(value);
  const sort = (a: string, b: string) => {
    const aa = Array.from(a, (c) => c.codePointAt(0)!);
    const bb = Array.from(b, (c) => c.codePointAt(0)!);
    for (let i = 0; i < Math.min(aa.length, bb.length); i++) {
      const first = aa[i],
        second = bb[i];
      if (first !== undefined && second !== undefined && first !== second) return first - second;
    }
    return aa.length - bb.length;
  };
  const encode = (item: JsonValue): string => {
    if (Array.isArray(item)) return `[${item.map(encode).join(",")}]`;
    if (record(item))
      return `{${Object.keys(item)
        .sort(sort)
        .map((key) => `${JSON.stringify(key)}:${encode(item[key] as JsonValue)}`)
        .join(",")}}`;
    return JSON.stringify(item);
  };
  return encode(value);
}
export function jsonBytes(value: unknown): number {
  assertJson(value);
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
export function cloneJson<T>(value: T): T {
  assertJson(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolve(root: Schema, reference: string): Schema {
  if (!reference.startsWith("#/")) throw new Error("Only local schema references are supported.");
  let result: unknown = root;
  for (const token of reference.slice(2).split("/")) {
    const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
    if (!record(result) || !own(result, key))
      throw new Error(`Missing schema reference ${reference}`);
    result = result[key];
  }
  return result as Schema;
}

/** Ignore protocol extensions while preserving open, lesson-owned JSON objects. */
export function recognizedFields(schema: Schema, value: JsonValue, root = schema): JsonValue {
  if (typeof schema === "boolean") return cloneJson(value);
  if (schema.$ref) return recognizedFields(resolve(root, schema.$ref as string), value, root);
  if (schema.oneOf || schema.anyOf) {
    for (const branch of (schema.oneOf ?? schema.anyOf) as Schema[]) {
      try {
        validateSchema(branch, value, root);
        return recognizedFields(branch, value, root);
      } catch (error) {
        if (!(error instanceof ProtocolError)) throw error;
      }
    }
  }
  if (Array.isArray(value) && schema.items !== undefined)
    return value.map((item) => recognizedFields(schema.items as Schema, item, root));
  if (record(value) && record(schema.properties)) {
    const result: Record<string, JsonValue> = Object.create(null);
    for (const key of Object.keys(schema.properties))
      if (own(value, key))
        result[key] = recognizedFields(
          schema.properties[key] as Schema,
          value[key] as JsonValue,
          root
        );
    return result;
  }
  return cloneJson(value);
}

/** Implements only the Draft 2020-12 keywords used by our canonical schemas. */
export function assertSchema(schema: Schema): void {
  const annotations = new Set([
    "$schema",
    "$id",
    "title",
    "description",
    "default",
    "examples",
    "x-operations",
  ]);
  const scalars = new Set([
    "type",
    "const",
    "enum",
    "required",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "minLength",
    "maxLength",
    "pattern",
    "minItems",
    "maxItems",
    "uniqueItems",
    "minProperties",
    "maxProperties",
  ]);
  const singular = new Set([
    "items",
    "additionalProperties",
    "propertyNames",
    "not",
    "if",
    "then",
    "else",
  ]);
  const check = (part: Schema) => {
    if (typeof part === "boolean") return;
    if (!record(part)) throw new Error("Invalid schema object.");
    for (const [key, value] of Object.entries(part)) {
      if (annotations.has(key)) continue;
      if (key === "$ref") {
        resolve(schema, value as string);
        continue;
      }
      if (key === "$defs" || key === "properties") {
        if (!record(value)) throw new Error(`Invalid ${key}`);
        Object.values(value).forEach((child) => check(child as Schema));
      } else if (["allOf", "anyOf", "oneOf"].includes(key)) {
        if (!Array.isArray(value) || !value.length) throw new Error(`Invalid ${key}`);
        value.forEach((child) => check(child as Schema));
      } else if (singular.has(key)) check(value as Schema);
      else if (!scalars.has(key)) throw new Error(`Unsupported schema keyword ${key}`);
      if (
        key === "type" &&
        !(Array.isArray(value) ? value : [value]).every((type) =>
          ["null", "object", "array", "string", "number", "integer", "boolean"].includes(
            type as string
          )
        )
      )
        throw new Error("Invalid schema type.");
      if (key === "pattern") new RegExp(value as string, "u");
    }
  };
  check(schema);
}

export function validateSchema(schema: Schema, value: unknown, root = schema): void {
  assertJson(value);
  const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
  const matches = (part: Schema, item: unknown): boolean => {
    try {
      visit(part, item, "");
      return true;
    } catch (error) {
      if (error instanceof ProtocolError) return false;
      throw error;
    }
  };
  const visit = (part: Schema, item: unknown, path: string): void => {
    const fail = () => {
      throw new ProtocolError("invalid_message", `Invalid data at ${path || "/"}.`);
    };
    if (part === true) return;
    if (part === false) fail();
    const rule = part as Record<string, unknown>;
    if (rule.$ref) visit(resolve(root, rule.$ref as string), item, path);
    if (rule.type) {
      const types = Array.isArray(rule.type) ? rule.type : [rule.type];
      if (
        !types.some((type) =>
          type === "null"
            ? item === null
            : type === "array"
              ? Array.isArray(item)
              : type === "object"
                ? record(item)
                : type === "integer"
                  ? typeof item === "number" && Number.isInteger(item)
                  : typeof item === type
        )
      )
        fail();
    }
    if (own(rule, "const") && !same(item, rule.const)) fail();
    if (rule.enum && !(rule.enum as unknown[]).some((entry) => same(item, entry))) fail();
    if (typeof item === "number") {
      if (typeof rule.minimum === "number" && item < rule.minimum) fail();
      if (typeof rule.maximum === "number" && item > rule.maximum) fail();
      if (typeof rule.exclusiveMinimum === "number" && item <= rule.exclusiveMinimum) fail();
      if (typeof rule.exclusiveMaximum === "number" && item >= rule.exclusiveMaximum) fail();
    }
    if (typeof item === "string") {
      const length = Array.from(item).length;
      if (typeof rule.minLength === "number" && length < rule.minLength) fail();
      if (typeof rule.maxLength === "number" && length > rule.maxLength) fail();
      if (rule.pattern && !new RegExp(rule.pattern as string, "u").test(item)) fail();
    }
    if (Array.isArray(item)) {
      if (typeof rule.minItems === "number" && item.length < rule.minItems) fail();
      if (typeof rule.maxItems === "number" && item.length > rule.maxItems) fail();
      if (rule.uniqueItems && new Set(item.map(canonicalJson)).size !== item.length) fail();
      if (rule.items !== undefined)
        item.forEach((child, index) => visit(rule.items as Schema, child, `${path}/${index}`));
    }
    if (record(item)) {
      const keys = Object.keys(item);
      if (typeof rule.minProperties === "number" && keys.length < rule.minProperties) fail();
      if (typeof rule.maxProperties === "number" && keys.length > rule.maxProperties) fail();
      if (rule.required && !(rule.required as string[]).every((key) => own(item, key))) fail();
      for (const key of keys) {
        if (rule.propertyNames !== undefined) visit(rule.propertyNames as Schema, key, path);
        if (record(rule.properties) && own(rule.properties, key))
          visit(
            rule.properties[key] as Schema,
            item[key],
            `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`
          );
        else if (rule.additionalProperties !== undefined)
          visit(rule.additionalProperties as Schema, item[key], `${path}/${key}`);
      }
    }
    for (const child of (rule.allOf as Schema[] | undefined) ?? []) visit(child, item, path);
    if (rule.anyOf && !(rule.anyOf as Schema[]).some((child) => matches(child, item))) fail();
    if (rule.oneOf && (rule.oneOf as Schema[]).filter((child) => matches(child, item)).length !== 1)
      fail();
    if (rule.not !== undefined && matches(rule.not as Schema, item)) fail();
    if (rule.if !== undefined) {
      const branch = matches(rule.if as Schema, item) ? rule.then : rule.else;
      if (branch !== undefined) visit(branch as Schema, item, path);
    }
  };
  visit(schema, value, "");
}
