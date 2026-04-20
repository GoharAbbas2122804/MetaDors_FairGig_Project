export function getApiErrorMessage(error, fallbackMessage) {
  const responseMessage = error?.response?.data?.message;

  if (typeof responseMessage === "string" && responseMessage.trim().length > 0) {
    return responseMessage;
  }

  if (error?.code === "ERR_NETWORK") {
    return "Unable to reach the server. Check that the API is running and reachable from this device.";
  }

  return fallbackMessage;
}
