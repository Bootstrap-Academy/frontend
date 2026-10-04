export { LessonSDK, type SDKOptions } from "./sdk";
export { bindLessonPointers, bindLessonStage, bindSceneKeyboard } from "./input";
export { calculateSurface, stagePoint, stageSize, minimumHitSize, type Surface } from "./surface";
export {
  validateManifest,
  validateMessage,
  validateInit,
  validateReplay,
  validateTranscript,
  hasCapability,
  operations,
  schemas,
  type Replay,
} from "./validation";
export { canonicalJson, jsonBytes, validateSchema, assertSchema } from "./schema";
export { playReplay, canonicalHash, readPointer, ReplayError, type ReplayDriver } from "./replay";
export {
  ProtocolError,
  type Capability,
  type CapabilityRequirement,
  type Clock,
  type Envelope,
  type Init,
  type JsonObject,
  type JsonValue,
  type Manifest,
  type Phase,
  type Sender,
  type StateSnapshot,
  type Transport,
  type Version,
} from "./types";
