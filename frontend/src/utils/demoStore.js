const CURRENT_USER_KEY =
  "surgitrack_current_user";

/* =========================================================
   INTERNAL HELPERS
========================================================= */

function read(key, fallback) {
  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error(
      "SurgiTrack storage read error:",
      error
    );

    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
}

/* =========================================================
   USER SESSION
========================================================= */

export function getCurrentUser() {
  return read(
    CURRENT_USER_KEY,
    {
      name: "User",
      employeeId: "",
      role: "",
    }
  );
}

export function saveCurrentUser(
  user
) {
  const cleaned = {
    name:
      String(
        user?.name || ""
      ).trim(),

    employeeId:
      String(
        user?.employeeId || ""
      ).trim(),

    role:
      String(
        user?.role || ""
      ).trim(),
  };

  write(
    CURRENT_USER_KEY,
    cleaned
  );

  return cleaned;
}

export function clearCurrentUser() {
  /*
   * IMPORTANT:
   * Logout only removes the active login session.
   *
   * It does NOT remove that employee's:
   * - active procedure
   * - history
   *
   * When FastAPI/DB is connected,
   * these records will live in the backend.
   */

  localStorage.removeItem(
    CURRENT_USER_KEY
  );
}

/* =========================================================
   PER-EMPLOYEE STORAGE NAMESPACE
========================================================= */

function getEmployeeStorageId() {
  const user =
    getCurrentUser();

  /*
   * Employee ID is our frontend identity
   * until backend authentication is connected.
   */

  const employeeId =
    normalize(
      user.employeeId
    );

  if (employeeId) {
    return employeeId;
  }

  /*
   * Fallback only prevents crashes.
   * Login now requires Employee ID.
   */

  return normalize(
    user.name
  ) || "anonymous";
}

function employeeKey(
  suffix
) {
  return `surgitrack_${getEmployeeStorageId()}_${suffix}`;
}

/* =========================================================
   ACTIVE PROCEDURE
========================================================= */

export function getCurrentProcedure() {
  return read(
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

  write(
    employeeKey(
      "active_procedure"
    ),
    record
  );

  return record;
}

export function clearCurrentProcedure() {
  localStorage.removeItem(
    employeeKey(
      "active_procedure"
    )
  );
}

/* =========================================================
   RFID SCANS
========================================================= */

export function getRfidScans() {
  return read(
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

  const alreadyExists =
    current.some(
      (item) =>
        item.uid ===
        scan.uid
    );

  if (alreadyExists) {
    return {
      added: false,
      scans: current,
    };
  }

  const updated = [
    ...current,
    scan,
  ];

  write(
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
        item.uid !== uid
    );

  write(
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
   VISION STATUS
========================================================= */

export function getVisionStatus() {
  return read(
    employeeKey(
      "vision_status"
    ),
    {
      preOpCaptured: false,
      postOpCaptured: false,
      preOpCapturedAt: null,
      postOpCapturedAt: null,
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

  write(
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

  write(
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
   EMPLOYEE PROCEDURE HISTORY
========================================================= */

export function getProcedureHistory() {
  return read(
    employeeKey(
      "procedure_history"
    ),
    []
  );
}

function saveProcedureHistory(
  history
) {
  write(
    employeeKey(
      "procedure_history"
    ),
    history
  );

  return history;
}

/* =========================================================
   ARCHIVE COMPLETED PROCEDURE

   This is the important part.

   Current workflow:
   Active Procedure
       ↓
   Archive
       ↓
   Employee History
       ↓
   Clear Active State
========================================================= */

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
      scans.map(
        (scan) => ({
          ...scan,
        })
      ),

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

    /*
     * CNN will later replace this field
     * with the actual reconciliation result.
     */

    visionReconciliation:
      "Awaiting AI integration",
  };

  const history =
    getProcedureHistory();

  const updatedHistory = [
    archiveRecord,
    ...history,
  ];

  saveProcedureHistory(
    updatedHistory
  );

  /*
   * Procedure has now moved to HISTORY.
   *
   * Remove active state so the next
   * procedure starts completely clean.
   */

  clearActiveProcedureState();

  return archiveRecord;
}

/* =========================================================
   CLEAR ONLY ACTIVE WORKFLOW

   HISTORY IS NEVER CLEARED HERE.
========================================================= */

export function clearActiveProcedureState() {
  clearCurrentProcedure();
  clearRfidScans();
  clearVisionStatus();
}