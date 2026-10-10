const CURRENT_USER_KEY =
  "surgitrack_current_user";

const AUTH_TOKEN_KEY =
  "surgitrack_auth_token";

const CURRENT_PROCEDURE_ID_KEY =
  "surgitrack_current_procedure_id";


/* =========================================================
   ALLOWED FRONTEND ROLES
========================================================= */

export const ALLOWED_ROLES = [
  "Doctor",
  "OT Technician",
  "Nurse",
];


function normalizeRole(
  role
) {
  const value =
    String(role || "")
      .trim()
      .toLowerCase();

  if (
    value === "doctor" ||
    value === "dr" ||
    value === "surgeon"
  ) {
    return "Doctor";
  }

  if (
    value === "ot technician" ||
    value === "ot_technician" ||
    value === "technician" ||
    value === "ot technician staff"
  ) {
    return "OT Technician";
  }

  if (
    value === "nurse" ||
    value === "ot nurse"
  ) {
    return "Nurse";
  }

  return String(
    role || ""
  ).trim();
}


export function isAllowedRole(
  role
) {
  return ALLOWED_ROLES.includes(
    normalizeRole(role)
  );
}


/* =========================================================
   INTERNAL STORAGE HELPERS
========================================================= */

function readJSON(
  key,
  fallback
) {
  try {
    const raw =
      localStorage.getItem(
        key
      );

    if (!raw) {
      return fallback;
    }

    return JSON.parse(
      raw
    );
  } catch (
    error
  ) {
    console.error(
      "SurgiTrack storage read error:",
      error
    );

    return fallback;
  }
}


function writeJSON(
  key,
  value
) {
  localStorage.setItem(
    key,
    JSON.stringify(
      value
    )
  );
}


/* =========================================================
   AUTH TOKEN
========================================================= */

export function saveAuthToken(
  token
) {
  if (!token) {
    return;
  }

  localStorage.setItem(
    AUTH_TOKEN_KEY,
    token
  );
}


export function getAuthToken() {
  return (
    localStorage.getItem(
      AUTH_TOKEN_KEY
    ) || ""
  );
}


export function clearAuthToken() {
  localStorage.removeItem(
    AUTH_TOKEN_KEY
  );
}


export function isAuthenticated() {
  return Boolean(
    getAuthToken()
  );
}


/* =========================================================
   CURRENT USER
========================================================= */

export function saveCurrentUser(
  user
) {
  const cleaned = {
    id:
      user?.id ??
      null,

    name:
      String(
        user?.name || ""
      ).trim(),

    employeeId:
      String(
        user?.employeeId ||
          user?.employee_id ||
          ""
      )
        .trim()
        .toUpperCase(),

    role:
      normalizeRole(
        user?.role
      ),

    email:
      String(
        user?.email || ""
      ).trim(),
  };

  writeJSON(
    CURRENT_USER_KEY,
    cleaned
  );

  return cleaned;
}


export function getCurrentUser() {
  return readJSON(
    CURRENT_USER_KEY,
    {
      id: null,
      name: "User",
      employeeId: "",
      role: "",
      email: "",
    }
  );
}


export function clearCurrentUser() {
  localStorage.removeItem(
    CURRENT_USER_KEY
  );

  localStorage.removeItem(
    CURRENT_PROCEDURE_ID_KEY
  );

  clearAuthToken();
}


/* =========================================================
   CURRENT PROCEDURE ID

   This is the only procedure-related local value we need
   after the frontend is fully connected.

   The full procedure itself comes from FastAPI.
========================================================= */

export function saveCurrentProcedureId(
  procedureId
) {
  if (
    procedureId === null ||
    procedureId === undefined
  ) {
    localStorage.removeItem(
      CURRENT_PROCEDURE_ID_KEY
    );

    return;
  }

  localStorage.setItem(
    CURRENT_PROCEDURE_ID_KEY,
    String(procedureId)
  );
}


export function getCurrentProcedureId() {
  const value =
    localStorage.getItem(
      CURRENT_PROCEDURE_ID_KEY
    );

  if (!value) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}


export function clearCurrentProcedureId() {
  localStorage.removeItem(
    CURRENT_PROCEDURE_ID_KEY
  );
}


/* =========================================================
   TEMPORARY LEGACY COMPATIBILITY

   Existing pages still import these functions.

   We will remove these after Dashboard / NewProcedure /
   RFID / Vision / FinalReconciliation are converted to API.
========================================================= */

function normalize(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9_-]/g,
      "_"
    );
}


function getEmployeeStorageId() {
  const user =
    getCurrentUser();

  return (
    normalize(
      user.employeeId
    ) ||
    normalize(
      user.name
    ) ||
    "anonymous"
  );
}


function employeeKey(
  suffix
) {
  return (
    `surgitrack_` +
    `${getEmployeeStorageId()}_` +
    suffix
  );
}


/* =========================================================
   LEGACY CURRENT PROCEDURE
========================================================= */

export function getCurrentProcedure() {
  return readJSON(
    employeeKey(
      "active_procedure"
    ),
    null
  );
}


export function saveCurrentProcedure(
  procedure
) {
  const record = {
    ...procedure,

    createdAt:
      procedure?.createdAt ||
      new Date().toISOString(),
  };

  writeJSON(
    employeeKey(
      "active_procedure"
    ),
    record
  );

  if (
    procedure?.id !==
      undefined &&
    procedure?.id !== null
  ) {
    saveCurrentProcedureId(
      procedure.id
    );
  }

  return record;
}


export function clearCurrentProcedure() {
  localStorage.removeItem(
    employeeKey(
      "active_procedure"
    )
  );

  clearCurrentProcedureId();
}


/* =========================================================
   LEGACY RFID STORAGE
========================================================= */

export function getRfidScans() {
  return readJSON(
    employeeKey(
      "rfid_scans"
    ),
    []
  );
}


export function addRfidScan(
  scan
) {
  const current =
    getRfidScans();

  const uid =
    scan?.uid ||
    scan?.rfid_uid;

  const duplicate =
    current.some(
      (item) =>
        (
          item?.uid ||
          item?.rfid_uid
        ) === uid
    );

  if (duplicate) {
    return {
      added: false,
      scans: current,
    };
  }

  const updated = [
    ...current,
    scan,
  ];

  writeJSON(
    employeeKey(
      "rfid_scans"
    ),
    updated
  );

  return {
    added: true,
    scans: updated,
  };
}


export function removeRfidScan(
  uid
) {
  const updated =
    getRfidScans().filter(
      (item) =>
        (
          item?.uid ||
          item?.rfid_uid
        ) !== uid
    );

  writeJSON(
    employeeKey(
      "rfid_scans"
    ),
    updated
  );

  return updated;
}


export function clearRfidScans() {
  localStorage.removeItem(
    employeeKey(
      "rfid_scans"
    )
  );
}


/* =========================================================
   LEGACY VISION STORAGE
========================================================= */

export function getVisionStatus() {
  return readJSON(
    employeeKey(
      "vision_status"
    ),
    {
      preOpCaptured:
        false,

      postOpCaptured:
        false,

      preOpCapturedAt:
        null,

      postOpCapturedAt:
        null,
    }
  );
}


export function setPreOpCaptured(
  captured = true
) {
  const current =
    getVisionStatus();

  const updated = {
    ...current,

    preOpCaptured:
      captured,

    preOpCapturedAt:
      captured
        ? new Date().toISOString()
        : null,
  };

  writeJSON(
    employeeKey(
      "vision_status"
    ),
    updated
  );

  return updated;
}


export function setPostOpCaptured(
  captured = true
) {
  const current =
    getVisionStatus();

  const updated = {
    ...current,

    postOpCaptured:
      captured,

    postOpCapturedAt:
      captured
        ? new Date().toISOString()
        : null,
  };

  writeJSON(
    employeeKey(
      "vision_status"
    ),
    updated
  );

  return updated;
}


export function clearVisionStatus() {
  localStorage.removeItem(
    employeeKey(
      "vision_status"
    )
  );
}


/* =========================================================
   LEGACY HISTORY STORAGE
========================================================= */

export function getProcedureHistory() {
  return readJSON(
    employeeKey(
      "procedure_history"
    ),
    []
  );
}


function saveProcedureHistory(
  history
) {
  writeJSON(
    employeeKey(
      "procedure_history"
    ),
    history
  );

  return history;
}


export function archiveCurrentProcedure() {
  const user =
    getCurrentUser();

  const procedure =
    getCurrentProcedure();

  const scans =
    getRfidScans();

  const vision =
    getVisionStatus();

  if (!procedure) {
    return null;
  }

  const completedAt =
    new Date().toISOString();

  const archiveRecord = {
    historyId:
      `SURGI-${Date.now()}`,

    caseId:
      procedure.caseId,

    procedureName:
      procedure.procedureName,

    otRoom:
      procedure.otRoom,

    surgeon:
      procedure.surgeon,

    startedAt:
      procedure.createdAt,

    completedAt,

    status:
      "Completed",

    attendedBy: {
      name:
        user.name,

      employeeId:
        user.employeeId,

      role:
        user.role,
    },

    rfidScans:
      scans,

    instrumentCount:
      scans.length,

    vision: {
      preOpCaptured:
        Boolean(
          vision.preOpCaptured
        ),

      postOpCaptured:
        Boolean(
          vision.postOpCaptured
        ),

      preOpCapturedAt:
        vision.preOpCapturedAt ||
        null,

      postOpCapturedAt:
        vision.postOpCapturedAt ||
        null,
    },
  };

  const history =
    getProcedureHistory();

  saveProcedureHistory([
    archiveRecord,
    ...history,
  ]);

  clearActiveProcedureState();

  return archiveRecord;
}


/* =========================================================
   LEGACY WORKFLOW CLEANUP
========================================================= */

export function clearActiveProcedureState() {
  clearCurrentProcedure();
  clearRfidScans();
  clearVisionStatus();
}