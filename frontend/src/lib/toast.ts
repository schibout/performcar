"use client";

import { notification as staticNotification } from "antd";

import type { NotificationInstance } from "antd/es/notification/interface";

let dynamicNotification: NotificationInstance | null = null;

// Bound by AntdProvider so module-level callers (api.ts, etc.) can use the
// theme-aware notification instance from antd's App context.
export function bindNotification(instance: NotificationInstance | null): void {
  dynamicNotification = instance;
}

interface ToastOptions {
  id?: string;
}

function getApi(): NotificationInstance | typeof staticNotification {
  return dynamicNotification ?? staticNotification;
}

export const toast = {
  success: (content: string, options?: ToastOptions): void => {
    getApi().success({ title: content, key: options?.id, placement: "topRight" });
  },
  error: (content: string, options?: ToastOptions): void => {
    getApi().error({ title: content, key: options?.id, placement: "topRight" });
  },
  info: (content: string, options?: ToastOptions): void => {
    getApi().info({ title: content, key: options?.id, placement: "topRight" });
  },
  warning: (content: string, options?: ToastOptions): void => {
    getApi().warning({ title: content, key: options?.id, placement: "topRight" });
  },
};
