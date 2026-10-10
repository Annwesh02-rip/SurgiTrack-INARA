import {
  clearCurrentUser,
  getAuthToken,
} from "../utils/demoStore";


/* =========================================================
   API CONFIGURATION
========================================================= */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");


/* =========================================================
   ERROR MESSAGE HELPER
========================================================= */

function getErrorMessage(
  data,
  fallback = "Request failed."
) {
  if (!data) {
    return fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (
    typeof data === "object" &&
    data.detail
  ) {
    if (
      typeof data.detail === "string"
    ) {
      return data.detail;
    }

    if (
      typeof data.detail === "object" &&
      data.detail.message
    ) {
      return data.detail.message;
    }

    try {
      return JSON.stringify(
        data.detail
      );
    } catch {
      return fallback;
    }
  }

  if (
    typeof data === "object" &&
    data.message
  ) {
    return data.message;
  }

  return fallback;
}


/* =========================================================
   GENERIC API REQUEST
========================================================= */

async function apiRequest(
  path,
  options = {}
) {
  const {
    method = "GET",
    body = null,
    auth = true,
    headers = {},
  } = options;

  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (
    body !== null &&
    !(body instanceof FormData)
  ) {
    requestHeaders["Content-Type"] =
      "application/json";
  }

  if (auth) {
    const token =
      getAuthToken();

    if (!token) {
      throw new Error(
        "Authentication required."
      );
    }

    requestHeaders.Authorization =
      `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        method,
        headers:
          requestHeaders,
        body:
          body === null
            ? undefined
            : body instanceof FormData
            ? body
            : JSON.stringify(
                body
              ),
      }
    );
  } catch (error) {
    console.error(
      "SurgiTrack API network error:",
      error
    );

    throw new Error(
      "Unable to connect to the SurgiTrack backend."
    );
  }

  let data = null;

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  try {
    if (
      contentType.includes(
        "application/json"
      )
    ) {
      data =
        await response.json();
    } else {
      const text =
        await response.text();

      data =
        text || null;
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    /*
     * Invalid/expired login.
     */
    if (
      response.status === 401 &&
      auth
    ) {
      clearCurrentUser();
    }

    throw new Error(
      getErrorMessage(
        data,
        `Request failed (${response.status}).`
      )
    );
  }

  return data;
}


/* =========================================================
   AUTHENTICATION
========================================================= */

export async function loginUser(
  employeeId,
  password
) {
  return apiRequest(
    "/auth/login",
    {
      method: "POST",

      body: {
        employee_id:
          employeeId,
        password,
      },

      auth: false,
    }
  );
}


export async function getMyProfile() {
  return apiRequest(
    "/auth/me"
  );
}


/* =========================================================
   HEALTH
========================================================= */

export async function checkBackendHealth() {
  return apiRequest(
    "/health",
    {
      auth: false,
    }
  );
}


/* =========================================================
   PROCEDURES
========================================================= */

export async function createProcedure(
  procedure
) {
  return apiRequest(
    "/procedures/",
    {
      method: "POST",

      body: {
        case_id:
          procedure.caseId,

        procedure_name:
          procedure.procedureName,

        surgeon_name:
          procedure.surgeon,

        ot_room:
          procedure.otRoom,
      },
    }
  );
}


export async function getProcedures() {
  return apiRequest(
    "/procedures/"
  );
}


export async function getProcedure(
  procedureId
) {
  return apiRequest(
    `/procedures/${procedureId}`
  );
}


export async function getProcedureHistory() {
  return apiRequest(
    "/procedures/history"
  );
}


export async function updateProcedureStatus(
  procedureId,
  status
) {
  const value =
    encodeURIComponent(
      status
    );

  return apiRequest(
    `/procedures/${procedureId}/status?procedure_status=${value}`,
    {
      method: "PATCH",
    }
  );
}


export async function cancelProcedure(
  procedureId
) {
  return apiRequest(
    `/procedures/${procedureId}/cancel`,
    {
      method: "POST",
    }
  );
}


/* =========================================================
   MASTER INSTRUMENT DATABASE
========================================================= */

export async function getMasterInstruments() {
  return apiRequest(
    "/instruments/"
  );
}


export async function getInstrument(
  rfidUid
) {
  return apiRequest(
    `/instruments/${encodeURIComponent(
      rfidUid
    )}`
  );
}


/* =========================================================
   PROCEDURE RFID INSTRUMENTS
========================================================= */

export async function getProcedureInstruments(
  procedureId
) {
  return apiRequest(
    `/instruments/procedure/${procedureId}`
  );
}


export async function registerProcedureInstrument(
  procedureId,
  rfidUid
) {
  return apiRequest(
    `/instruments/procedure/${procedureId}`,
    {
      method: "POST",

      body: {
        rfid_uid:
          rfidUid,
      },
    }
  );
}


export async function removeProcedureInstrument(
  procedureId,
  rfidUid
) {
  return apiRequest(
    `/instruments/procedure/${procedureId}/${encodeURIComponent(
      rfidUid
    )}`,
    {
      method: "DELETE",
    }
  );
}


/* =========================================================
   IMAGES + CNN
========================================================= */

export async function uploadProcedureImage(
  procedureId,
  imageType,
  file
) {
  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  const query =
    new URLSearchParams({
      procedure_id:
        String(procedureId),

      image_type:
        imageType,
    });

  return apiRequest(
    `/images/upload?${query.toString()}`,
    {
      method: "POST",
      body:
        formData,
    }
  );
}


export async function getProcedureImages(
  procedureId
) {
  return apiRequest(
    `/images/procedure/${procedureId}`
  );
}


/* =========================================================
   RFID HARDWARE
========================================================= */

export async function connectRFID() {
  return apiRequest(
    "/rfid/connect",
    {
      method: "POST",
    }
  );
}


export async function disconnectRFID() {
  return apiRequest(
    "/rfid/disconnect",
    {
      method: "POST",
    }
  );
}


export async function getRFIDStatus() {
  return apiRequest(
    "/rfid/status"
  );
}


export async function scanRFID() {
  return apiRequest(
    "/rfid/scan"
  );
}


export async function getLatestRFIDScan() {
  return apiRequest(
    "/rfid/latest"
  );
}


/* =========================================================
   FINAL VERIFICATION
========================================================= */

export async function runVerification(
  procedureId
) {
  return apiRequest(
    "/verification/run",
    {
      method: "POST",

      body: {
        procedure_id:
          procedureId,

        verification_type:
          "combined",
      },
    }
  );
}