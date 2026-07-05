export function devLog(message: string, data?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "development") {
    console.log(message, data ?? {});
  }
}
