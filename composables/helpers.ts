import { useState } from '#app';

export function getRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function roundOffTo(value: any, points: number) {
  return value % 1 == 0 ? value : parseFloat(value.toString()).toFixed(points);
}

export function abbreviateNumber(number: number) {
  if (number < 1e3) return number;
  if (number >= 1e3 && number < 1e6) return +(number / 1e3).toFixed(1) + 'K';
  if (number >= 1e6 && number < 1e9) return +(number / 1e6).toFixed(1) + 'M';
  if (number >= 1e9 && number < 1e12) return +(number / 1e9).toFixed(1) + 'B';
  if (number >= 1e12) return +(number / 1e12).toFixed(1) + 'T';
}

export function get_x_timeAgo(timestamp: number) {
  let dateObj = new Date(timestamp * 1000);

  const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
  const interval = intervals.find((i) => i.seconds < seconds);
  const count = Math.floor(seconds / interval.seconds);
  return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
}

let intervals: any[] = [
  { label: 'yr', seconds: 31536000 },
  { label: 'mth', seconds: 2592000 },
  { label: 'd', seconds: 86400 },
  { label: 'hr', seconds: 3600 },
  { label: 'min', seconds: 60 },
  { label: '', seconds: 1 },
];

let days = [
  'Days.Sunday',
  'Days.Monday',
  'Days.Tuesday',
  'Days.Wednesday',
  'Days.Thursday',
  'Days.Friday',
  'Days.Saturday',
];

let months = [
  'Months.January',
  'Months.February',
  'Months.March',
  'Months.April',
  'Months.May',
  'Months.June',
  'Months.July',
  'Months.August',
  'Months.September',
  'Months.October',
  'Months.November',
  'Months.December',
];

export function convertDateToTimestamp(date: any) {
  const timestampInMS = date.getTime();

  return timestampInMS / 1000;
}

export function convertTimestampToDate(timestamp: number) {
  let dateObj = new Date(timestamp * 1000);

  let date = dateObj.getDate();

  let day = {
    number: dateObj.getDay(),
    string: days[dateObj.getDay()],
  };
  let month = {
    number: dateObj.getMonth(),
    string: months[dateObj.getMonth()],
  };
  let year = dateObj.getFullYear();

  let time = dateObj.getTime();

  let seconds = time / 1000;
  let minutes = seconds / 60;
  let hours = minutes / 60;

  return { date, day, month, year, seconds, minutes, hours };
}

export function getDateParam(dateObj: any) {
  let date = dateObj.getDate();

  let day = {
    number: dateObj.getDay(),
    string: days[dateObj.getDay()],
  };
  let month = {
    number: dateObj.getMonth(),
    string: months[dateObj.getMonth()],
  };
  let year = dateObj.getFullYear();

  let time = dateObj.getTime();

  let seconds = time / 1000;
  let minutes = seconds / 60;
  let hours = minutes / 60;

  return { date, day, month, year, seconds, minutes, hours };
}

import {
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/solid';

function useSuccessTheme() {
  return {
    bg: 'bg-success',
    bgLight: 'bg-success-light',
    fill: 'fill-success',
    stroke: 'stroke-success',
    border: 'border-success',
    text: 'text-success',
    icon: CheckCircleIcon,
  };
}

function useErrorTheme() {
  return {
    bg: 'bg-error',
    bgLight: 'bg-error-light',
    fill: 'fill-error',
    stroke: 'stroke-error',
    border: 'border-error',
    text: 'text-error',
    icon: XCircleIcon,
  };
}

function useInfoTheme() {
  return {
    bg: 'bg-info',
    bgLight: 'bg-info-light',
    fill: 'fill-info',
    stroke: 'stroke-info',
    border: 'border-info',
    text: 'text-info',
    icon: InformationCircleIcon,
  };
}

function useWarningTheme() {
  return {
    bg: 'bg-warning',
    bgLight: 'bg-warning-light',
    fill: 'fill-warning',
    stroke: 'stroke-warning',
    border: 'border-warning',
    text: 'text-warning',
    icon: ExclamationCircleIcon,
  };
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
