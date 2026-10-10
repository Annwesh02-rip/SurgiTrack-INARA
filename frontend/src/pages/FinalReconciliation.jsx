import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import {
  useNavigate,
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleX,
  Database,
  Eye,
  LoaderCircle,
  RadioTower,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  getProcedure,
  getProcedureInstruments,
} from "../services/api";

import {
  archiveCurrentProcedure,
  getCurrentProcedure,
  getCurrentProcedureId,
  getCurrentUser,
} from "../utils/demoStore";


/* =========================================================
   STORAGE KEYS
========================================================= */

function preOpVisionKey(
  procedureId
) {
  return (
    `surgitrack_procedure_${procedureId}_preop_vision`
  );
}


function postOpVisionKey(
  procedureId
) {
  return (
    `surgitrack_procedure_${procedureId}_postop_vision`
  );
}


function comparisonKey(
  procedureId
) {
  return (
    `surgitrack_procedure_${procedureId}_postop_comparison`
  );
}


function postOpRFIDKey(
  procedureId
) {
  return (
    `surgitrack_procedure_${procedureId}_postop_rfid`
  );
}


function timingKey(
  procedureId
) {
  return (
    `surgitrack_procedure_${procedureId}_rfid_timing`
  );
}


function finalResultKey(
  procedureId
) {
  return (
    `surgitrack_procedure_${procedureId}_final_reconciliation`
  );
}


/* =========================================================
   STORAGE HELPERS
========================================================= */

function readJson(
  key,
  fallback
) {
  try {
    const value =
      localStorage.getItem(
        key
      );

    if (!value) {
      return fallback;
    }

    return JSON.parse(
      value
    );
  } catch {
    return fallback;
  }
}


function saveJson(
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
   NORMALIZATION
========================================================= */

function canonicalName(
  value
) {
  const raw =
    String(
      value ?? ""
    ).trim();

  const key =
    raw.toLowerCase();

  if (
    key === "scissor" ||
    key === "scissors"
  ) {
    return "Scissors";
  }

  if (
    key === "scalpel" ||
    key === "scalpels"
  ) {
    return "Scalpel";
  }

  if (
    key === "forcep" ||
    key === "forceps"
  ) {
    return "Forceps";
  }

  if (
    key === "hemostat" ||
    key === "hemostats"
  ) {
    return "Hemostat";
  }

  return raw;
}


function normalizeCounts(
  counts
) {
  const normalized = {};

  Object.entries(
    counts ?? {}
  ).forEach(
    ([
      name,
      value,
    ]) => {
      const canonical =
        canonicalName(
          name
        );

      if (!canonical) {
        return;
      }

      normalized[
        canonical
      ] =
        (
          normalized[
            canonical
          ] ?? 0
        ) +
        Number(
          value ?? 0
        );
    }
  );

  return normalized;
}


function normalizeInstrument(
  item
) {
  return {
    rfidUid:
      item?.instrument_rfid_uid ??
      item?.rfid_uid ??
      item?.instrument?.rfid_uid ??
      "",

    name:
      canonicalName(
        item?.instrument?.name ??
        item?.instrument_name ??
        item?.name ??
        "Instrument"
      ),

    expected:
      item?.expected !==
      false,
  };
}


function createCountsFromInstruments(
  instruments
) {
  const counts = {};

  instruments.forEach(
    (instrument) => {
      const name =
        canonicalName(
          instrument.name
        );

      if (!name) {
        return;
      }

      counts[
        name
      ] =
        (
          counts[
            name
          ] ?? 0
        ) + 1;
    }
  );

  return counts;
}


/* =========================================================
   CNN COMPARISON
========================================================= */

function compareCounts(
  expectedCounts,
  actualCounts
) {
  const expected =
    normalizeCounts(
      expectedCounts
    );

  const actual =
    normalizeCounts(
      actualCounts
    );

  const names =
    new Set([
      ...Object.keys(
        expected
      ),

      ...Object.keys(
        actual
      ),
    ]);

  const missing = [];

  const unexpected = [];

  names.forEach(
    (name) => {
      const expectedCount =
        Number(
          expected[
            name
          ] ?? 0
        );

      const actualCount =
        Number(
          actual[
            name
          ] ?? 0
        );

      if (
        actualCount <
        expectedCount
      ) {
        missing.push({
          name,

          count:
            expectedCount -
            actualCount,
        });
      }

      if (
        actualCount >
        expectedCount
      ) {
        unexpected.push({
          name,

          count:
            actualCount -
            expectedCount,
        });
      }
    }
  );

  return {
    status:
      (
        missing.length ===
          0 &&
        unexpected.length ===
          0
      )
        ? "correct"
        : "fault",

    expected,

    actual,

    missing,

    unexpected,
  };
}


/* =========================================================
   MAIN PAGE
========================================================= */

export default function FinalReconciliation() {
  const navigate =
    useNavigate();

  const user =
    getCurrentUser();

  const storedProcedure =
    getCurrentProcedure();

  const procedureId =
    getCurrentProcedureId() ??
    storedProcedure?.id ??
    null;


  const [
    procedure,
    setProcedure,
  ] = useState(
    storedProcedure ??
      null
  );


  const [
    expectedInstruments,
    setExpectedInstruments,
  ] = useState([]);


  const [
    preOpVision,
    setPreOpVision,
  ] = useState(null);


  const [
    postOpVision,
    setPostOpVision,
  ] = useState(null);


  const [
    savedComparison,
    setSavedComparison,
  ] = useState(null);


  const [
    postOpRFID,
    setPostOpRFID,
  ] = useState({
    verified: {},
    unexpected: [],
    unknown: [],
    finalized: false,
  });


  const [
    timing,
    setTiming,
  ] = useState({});


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    completing,
    setCompleting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  /* =====================================================
     LOAD FINAL PROCEDURE DATA
  ===================================================== */

  useEffect(() => {
    const loadData =
      async () => {
        if (!procedureId) {
          setError(
            "No active procedure was found."
          );

          setLoading(
            false
          );

          return;
        }

        try {
          const [
            procedureData,
            instrumentData,
          ] =
            await Promise.all([
              getProcedure(
                procedureId
              ),

              getProcedureInstruments(
                procedureId
              ),
            ]);

          setProcedure(
            procedureData
          );

          const normalized =
            (
              Array.isArray(
                instrumentData
              )
                ? instrumentData
                : []
            )
              .map(
                normalizeInstrument
              )
              .filter(
                (
                  instrument
                ) =>
                  instrument.rfidUid
              );

          setExpectedInstruments(
            normalized
          );


          setPreOpVision(
            readJson(
              preOpVisionKey(
                procedureId
              ),
              null
            )
          );


          setPostOpVision(
            readJson(
              postOpVisionKey(
                procedureId
              ),
              null
            )
          );


          setSavedComparison(
            readJson(
              comparisonKey(
                procedureId
              ),
              null
            )
          );


          setPostOpRFID(
            readJson(
              postOpRFIDKey(
                procedureId
              ),
              {
                verified: {},
                unexpected: [],
                unknown: [],
                finalized: false,
              }
            )
          );


          setTiming(
            readJson(
              timingKey(
                procedureId
              ),
              {}
            )
          );

        } catch (
          loadError
        ) {
          console.error(
            loadError
          );

          setError(
            loadError?.message ??
              "Unable to load reconciliation data."
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    loadData();
  }, [procedureId]);


  /* =====================================================
     EXPECTED CNN COUNTS
  ===================================================== */

  const expectedCounts =
    useMemo(
      () => {
        const preCounts =
          normalizeCounts(
            preOpVision?.counts ??
              {}
          );

        if (
          Object.keys(
            preCounts
          ).length > 0
        ) {
          return preCounts;
        }

        return (
          createCountsFromInstruments(
            expectedInstruments
          )
        );
      },
      [
        preOpVision,
        expectedInstruments,
      ]
    );


  /* =====================================================
     POST-OP CNN COUNTS
  ===================================================== */

  const actualCounts =
    useMemo(
      () =>
        normalizeCounts(
          postOpVision?.counts ??
            {}
        ),
      [
        postOpVision,
      ]
    );


  /* =====================================================
     CNN COMPARISON
  ===================================================== */

  const cnnComparison =
    useMemo(
      () => {
        if (
          savedComparison &&
          (
            savedComparison.status ===
              "correct" ||
            savedComparison.status ===
              "fault"
          )
        ) {
          return {
            ...savedComparison,

            expected:
              normalizeCounts(
                savedComparison.expected ??
                  expectedCounts
              ),

            actual:
              normalizeCounts(
                savedComparison.actual ??
                  actualCounts
              ),

            missing:
              Array.isArray(
                savedComparison.missing
              )
                ? savedComparison.missing
                : [],

            unexpected:
              Array.isArray(
                savedComparison.unexpected
              )
                ? savedComparison.unexpected
                : [],
          };
        }

        return compareCounts(
          expectedCounts,
          actualCounts
        );
      },
      [
        savedComparison,
        expectedCounts,
        actualCounts,
      ]
    );


  /* =====================================================
     RFID RECONCILIATION
  ===================================================== */

  const verifiedRFID =
    postOpRFID?.verified ??
    {};


  const unexpectedRFID =
    Array.isArray(
      postOpRFID?.unexpected
    )
      ? postOpRFID.unexpected
      : [];


  const unknownRFID =
    Array.isArray(
      postOpRFID?.unknown
    )
      ? postOpRFID.unknown
      : [];


  const rfidFinalized =
    Boolean(
      postOpRFID?.finalized
    );


  const missingRFID =
    useMemo(
      () =>
        expectedInstruments.filter(
          (
            instrument
          ) =>
            !verifiedRFID[
              instrument.rfidUid
            ]
        ),
      [
        expectedInstruments,
        verifiedRFID,
      ]
    );


  const rfidSafe =
    (
      rfidFinalized &&
      missingRFID.length ===
        0 &&
      unexpectedRFID.length ===
        0 &&
      unknownRFID.length ===
        0
    );


  /* =====================================================
     CNN STATUS
  ===================================================== */

  const cnnCompleted =
    Boolean(
      preOpVision &&
      postOpVision
    );


  const cnnSafe =
    (
      cnnCompleted &&
      cnnComparison.status ===
        "correct"
    );


  /* =====================================================
     FINAL STATUS

     Anything unresolved = MISMATCH.

     There is no automatic SAFE result when data is
     incomplete.
  ===================================================== */

  const finalStatus =
    (
      rfidSafe &&
      cnnSafe
    )
      ? "VERIFIED"
      : "MISMATCH";


  const isMismatch =
    finalStatus ===
    "MISMATCH";


  /* =====================================================
     BUILD MISMATCH REASONS
  ===================================================== */

  const mismatchReasons =
    useMemo(
      () => {
        const reasons = [];

        if (!rfidFinalized) {
          reasons.push(
            "Post-op RFID recheck was not finalized."
          );
        }

        missingRFID.forEach(
          (
            instrument
          ) => {
            reasons.push(
              `RFID missing: ${instrument.name} (${instrument.rfidUid})`
            );
          }
        );


        unexpectedRFID.forEach(
          (
            instrument
          ) => {
            reasons.push(
              `Unexpected RFID: ${
                instrument?.name ??
                instrument?.rfidUid ??
                "Unknown instrument"
              }`
            );
          }
        );


        unknownRFID.forEach(
          (
            instrument
          ) => {
            reasons.push(
              `Unknown RFID tag: ${
                instrument?.rfidUid ??
                "Unknown UID"
              }`
            );
          }
        );


        if (!preOpVision) {
          reasons.push(
            "Pre-op CNN baseline is unavailable."
          );
        }


        if (!postOpVision) {
          reasons.push(
            "Post-op CNN scan is unavailable."
          );
        }


        cnnComparison.missing.forEach(
          (
            item
          ) => {
            reasons.push(
              `CNN missing: ${item.name} × ${item.count}`
            );
          }
        );


        cnnComparison.unexpected.forEach(
          (
            item
          ) => {
            reasons.push(
              `CNN unexpected: ${item.name} × ${item.count}`
            );
          }
        );


        return [
          ...new Set(
            reasons
          ),
        ];
      },
      [
        rfidFinalized,
        missingRFID,
        unexpectedRFID,
        unknownRFID,
        preOpVision,
        postOpVision,
        cnnComparison,
      ]
    );


  /* =====================================================
     SAVE / END PROCEDURE
  ===================================================== */

  const finishProcedure =
    () => {
      if (
        completing ||
        !procedureId
      ) {
        return;
      }

      setCompleting(
        true
      );

      const result = {
        procedureId,

        status:
          finalStatus,

        closureAllowed:
          !isMismatch,

        reconciledAt:
          new Date()
            .toISOString(),

        rfid: {
          finalized:
            rfidFinalized,

          returned:
            Object.keys(
              verifiedRFID
            ).length,

          expected:
            expectedInstruments.length,

          missing:
            missingRFID,

          unexpected:
            unexpectedRFID,

          unknown:
            unknownRFID,
        },

        vision: {
          preOp:
            preOpVision,

          postOp:
            postOpVision,

          comparison:
            cnnComparison,
        },

        mismatchReasons,
      };


      saveJson(
        finalResultKey(
          procedureId
        ),
        result
      );


      try {
        archiveCurrentProcedure();
      } catch (
        archiveError
      ) {
        console.warn(
          archiveError
        );
      }


      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );
    };


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
        <LoaderCircle className="h-10 w-10 animate-spin text-[#876C4C]" />
      </div>
    );
  }


  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F0E8] text-[#2D2A26]">

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0 bg-[url('/doctors-bg.jpg')] bg-cover bg-center"
          style={{
            opacity: 0.14,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/98 via-[#F5F0E8]/94 to-[#F5F0E8]/78" />
      </div>


      {/* HEADER */}

      <header className="relative z-40 border-b border-[#DED5CA] bg-[#FAF7F2]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-[78px] max-w-[1600px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/post-op-scan"
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD2C5] bg-[#FFFDF9]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>


            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4C5B3] bg-[#FFFDF9]">
                {isMismatch ? (
                  <ShieldAlert className="h-5 w-5 text-red-700" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                )}
              </div>

              <div>
                <div className="text-sm font-semibold tracking-[0.14em]">
                  SURGITRACK
                </div>

                <div className="text-[10px] text-[#9D9287]">
                  FINAL RECONCILIATION
                </div>
              </div>

            </div>

          </div>


          <div className="hidden items-center gap-3 sm:flex">

            <div className="text-right">
              <div className="text-sm font-medium">
                {user?.name ??
                  "User"}
              </div>

              <div className="text-[11px] text-[#968C82]">
                {user?.employeeId ??
                  ""}
                {user?.role
                  ? ` · ${user.role}`
                  : ""}
              </div>
            </div>

            <UserRound className="h-5 w-5 text-[#9A724A]" />

          </div>

        </div>
      </header>


      {/* MAIN */}

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-9 lg:px-8">

        {/* TITLE */}

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A724A]">
              <ShieldCheck className="h-4 w-4" />
              Surgical Instrument Verification
            </div>

            <h1 className="text-3xl font-black tracking-[-0.035em] lg:text-4xl">
              Final Reconciliation
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#877D73]">
              RFID return verification and post-op CNN detections are cross-checked against the pre-op instrument baseline.
            </p>
          </div>


          <div
            className={`rounded-2xl border px-6 py-4 ${
              isMismatch
                ? "border-red-300 bg-red-50"
                : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <div
              className={`text-xs font-black uppercase tracking-[0.18em] ${
                isMismatch
                  ? "text-red-700"
                  : "text-emerald-700"
              }`}
            >
              Final Status
            </div>

            <div
              className={`mt-1 text-2xl font-black ${
                isMismatch
                  ? "text-red-800"
                  : "text-emerald-800"
              }`}
            >
              {finalStatus}
            </div>
          </div>

        </div>


        {/* CASE */}

        <div className="mt-7 rounded-[22px] border border-[#DED3C6] bg-[#FFFDF9]/90 px-6 py-5">

          <div className="font-bold">
            {procedure?.procedure_name ??
              procedure?.procedureName ??
              "Current Procedure"}
          </div>

          <div className="mt-1 text-sm text-[#8A8076]">
            Patient:{" "}
            {procedure?.patient_name ??
              procedure?.patientName ??
              "—"}
            {" · "}
            OT:{" "}
            {procedure?.operating_room ??
              procedure?.otRoom ??
              "—"}
          </div>

        </div>


        {/* SOURCE CARDS */}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">

          <SourceCard
            icon={
              RadioTower
            }
            title="Post-Op RFID"
            value={
              `${Object.keys(
                verifiedRFID
              ).length}/${expectedInstruments.length} returned`
            }
            state={
              rfidSafe
                ? "safe"
                : "fault"
            }
          />


          <SourceCard
            icon={
              Eye
            }
            title="Pre-Op Baseline"
            value={
              preOpVision
                ? `${Object.values(
                    expectedCounts
                  ).reduce(
                    (
                      total,
                      count
                    ) =>
                      total +
                      Number(
                        count
                      ),
                    0
                  )} expected`
                : "Unavailable"
            }
            state={
              preOpVision
                ? "safe"
                : "fault"
            }
          />


          <SourceCard
            icon={
              ScanLine
            }
            title="Post-Op CNN"
            value={
              postOpVision
                ? `${postOpVision.total ?? 0} detected`
                : "Unavailable"
            }
            state={
              cnnSafe
                ? "safe"
                : "fault"
            }
          />

        </div>


        {/* FINAL BIG STATUS */}

        <motion.section
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className={`mt-6 rounded-[30px] border p-7 ${
            isMismatch
              ? "border-red-300 bg-red-50/95"
              : "border-emerald-300 bg-emerald-50/95"
          }`}
        >

          <div className="flex flex-col gap-5 md:flex-row md:items-center">

            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${
                isMismatch
                  ? "bg-red-100"
                  : "bg-emerald-100"
              }`}
            >
              {isMismatch ? (
                <CircleX className="h-9 w-9 text-red-700" />
              ) : (
                <CheckCircle2 className="h-9 w-9 text-emerald-700" />
              )}
            </div>


            <div>

              <div
                className={`text-sm font-black uppercase tracking-[0.18em] ${
                  isMismatch
                    ? "text-red-700"
                    : "text-emerald-700"
                }`}
              >
                Final Surgical Instrument Check
              </div>


              <h2
                className={`mt-2 text-3xl font-black ${
                  isMismatch
                    ? "text-red-900"
                    : "text-emerald-900"
                }`}
              >
                {isMismatch
                  ? "MISMATCH — CLOSURE BLOCKED"
                  : "VERIFIED — ALL SOURCES AGREE"}
              </h2>


              <p
                className={`mt-3 max-w-3xl text-sm leading-6 ${
                  isMismatch
                    ? "text-red-800"
                    : "text-emerald-800"
                }`}
              >
                {isMismatch
                  ? "One or more RFID or CNN checks disagree with the expected pre-op instrument inventory. The procedure cannot receive a clear verification result."
                  : "RFID identity, returned instrument status and CNN visual verification all agree with the pre-op baseline."}
              </p>

            </div>

          </div>

        </motion.section>


        {/* DETAILS */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">

          {/* INSTRUMENT TABLE */}

          <section className="overflow-hidden rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/94 shadow-sm">

            <div className="flex items-center justify-between border-b border-[#E8E0D7] px-6 py-5">

              <div>
                <h2 className="font-black">
                  Instrument Reconciliation
                </h2>

                <p className="mt-1 text-xs text-[#958B81]">
                  Pre-op expected inventory vs RFID return and CNN detection
                </p>
              </div>

              <Database className="h-5 w-5 text-[#A27A53]" />

            </div>


            {expectedInstruments.length ===
            0 ? (
              <div className="p-10 text-center text-sm text-[#968C82]">
                No expected instrument records are available.
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[850px]">

                  <thead>
                    <tr className="border-b border-[#E8E0D7] text-left text-[10px] uppercase tracking-wider text-[#90857A]">

                      <th className="px-5 py-4">
                        RFID
                      </th>

                      <th className="px-5 py-4">
                        Instrument
                      </th>

                      <th className="px-5 py-4">
                        RFID Return
                      </th>

                      <th className="px-5 py-4">
                        CNN Expected
                      </th>

                      <th className="px-5 py-4">
                        CNN Actual
                      </th>

                      <th className="px-5 py-4">
                        Result
                      </th>

                    </tr>
                  </thead>


                  <tbody>

                    {expectedInstruments.map(
                      (
                        instrument
                      ) => {
                        const uid =
                          instrument.rfidUid;

                        const name =
                          canonicalName(
                            instrument.name
                          );

                        const returned =
                          Boolean(
                            verifiedRFID[
                              uid
                            ]
                          );

                        const expected =
                          Number(
                            expectedCounts[
                              name
                            ] ?? 0
                          );

                        const actual =
                          Number(
                            actualCounts[
                              name
                            ] ?? 0
                          );

                        const cnnMatch =
                          actual >=
                          expected;

                        const rowMatch =
                          returned &&
                          cnnMatch;


                        const timeRecord =
                          timing[
                            uid
                          ] ?? {};


                        return (
                          <tr
                            key={
                              uid
                            }
                            className="border-b border-[#EEE7DD]"
                          >

                            <td className="px-5 py-4 font-mono text-xs">
                              {uid}
                            </td>


                            <td className="px-5 py-4 font-bold">
                              {name}
                            </td>


                            <td className="px-5 py-4">

                              {returned ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    RETURNED
                                  </span>

                                  {timeRecord?.timeOut && (
                                    <div className="mt-1 text-[10px] text-[#8A8177]">
                                      {new Date(
                                        timeRecord.timeOut
                                      ).toLocaleTimeString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                  <CircleX className="h-3.5 w-3.5" />
                                  MISSING
                                </span>
                              )}

                            </td>


                            <td className="px-5 py-4 text-center font-black">
                              {expected}
                            </td>


                            <td
                              className={`px-5 py-4 text-center font-black ${
                                cnnMatch
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {actual}
                            </td>


                            <td className="px-5 py-4">

                              {rowMatch ? (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                                  MATCH
                                </span>
                              ) : (
                                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                                  MISMATCH
                                </span>
                              )}

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </section>


          {/* RIGHT COLUMN */}

          <div className="space-y-6">

            {/* RFID */}

            <StatusPanel
              icon={
                RadioTower
              }
              title="RFID Reconciliation"
              safe={
                rfidSafe
              }
            >

              <StatusRow
                label="Expected"
                value={
                  expectedInstruments.length
                }
              />

              <StatusRow
                label="Returned"
                value={
                  Object.keys(
                    verifiedRFID
                  ).length
                }
              />

              <StatusRow
                label="Missing"
                value={
                  missingRFID.length
                }
                bad={
                  missingRFID.length >
                  0
                }
              />

              <StatusRow
                label="Unexpected"
                value={
                  unexpectedRFID.length
                }
                bad={
                  unexpectedRFID.length >
                  0
                }
              />

              <StatusRow
                label="Unknown"
                value={
                  unknownRFID.length
                }
                bad={
                  unknownRFID.length >
                  0
                }
              />

            </StatusPanel>


            {/* CNN */}

            <StatusPanel
              icon={
                Eye
              }
              title="CNN Reconciliation"
              safe={
                cnnSafe
              }
            >

              <StatusRow
                label="Pre-Op Expected"
                value={
                  Object.values(
                    expectedCounts
                  ).reduce(
                    (
                      total,
                      count
                    ) =>
                      total +
                      Number(
                        count
                      ),
                    0
                  )
                }
              />

              <StatusRow
                label="Post-Op Detected"
                value={
                  Object.values(
                    actualCounts
                  ).reduce(
                    (
                      total,
                      count
                    ) =>
                      total +
                      Number(
                        count
                      ),
                    0
                  )
                }
              />

              <StatusRow
                label="Missing Classes"
                value={
                  cnnComparison
                    .missing
                    .length
                }
                bad={
                  cnnComparison
                    .missing
                    .length > 0
                }
              />

              <StatusRow
                label="Unexpected Classes"
                value={
                  cnnComparison
                    .unexpected
                    .length
                }
                bad={
                  cnnComparison
                    .unexpected
                    .length > 0
                }
              />

            </StatusPanel>


            {/* MISMATCH DETAILS */}

            {isMismatch && (
              <section className="rounded-[28px] border border-red-200 bg-red-50 p-6">

                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />

                  <h3 className="font-black">
                    Mismatch Details
                  </h3>
                </div>


                {mismatchReasons.length ===
                0 ? (
                  <p className="mt-4 text-sm text-red-700">
                    Reconciliation did not satisfy all safety conditions.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">

                    {mismatchReasons.map(
                      (
                        reason,
                        index
                      ) => (
                        <div
                          key={
                            `${reason}-${index}`
                          }
                          className="flex gap-3 rounded-xl bg-white/70 p-3 text-sm font-semibold text-red-800"
                        >
                          <CircleX className="mt-0.5 h-4 w-4 shrink-0" />

                          <span>
                            {reason}
                          </span>
                        </div>
                      )
                    )}

                  </div>
                )}

              </section>
            )}


            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}


            {/* FINISH */}

            <motion.button
              type="button"
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale: 0.985,
              }}
              disabled={
                completing
              }
              onClick={
                finishProcedure
              }
              className={`flex h-14 w-full items-center justify-center rounded-2xl text-sm font-black text-white disabled:opacity-50 ${
                isMismatch
                  ? "bg-red-700"
                  : "bg-emerald-700"
              }`}
            >

              {completing ? (
                <span className="flex items-center gap-3">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving Final Result...
                </span>
              ) : isMismatch ? (
                <span className="flex items-center gap-3">
                  <ShieldAlert className="h-4 w-4" />
                  End Procedure With Mismatch
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4" />
                  Complete Verified Procedure
                </span>
              )}

            </motion.button>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/post-op-scan"
                )
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D7CCBF] bg-[#FFFDF9]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Post-Op
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   SOURCE CARD
========================================================= */

function SourceCard({
  icon: Icon,
  title,
  value,
  state,
}) {
  const safe =
    state ===
    "safe";

  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      className={`rounded-[22px] border p-5 ${
        safe
          ? "border-emerald-200 bg-emerald-50/90"
          : "border-red-200 bg-red-50/90"
      }`}
    >

      <div className="flex items-center justify-between">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            safe
              ? "bg-emerald-100"
              : "bg-red-100"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              safe
                ? "text-emerald-700"
                : "text-red-700"
            }`}
          />
        </div>


        <span
          className={`rounded-full px-3 py-1 text-[9px] font-black ${
            safe
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {safe
            ? "MATCH"
            : "MISMATCH"}
        </span>

      </div>


      <div className="mt-5 text-sm font-black">
        {title}
      </div>

      <div className="mt-2 text-xs text-[#7E746A]">
        {value}
      </div>

    </motion.div>
  );
}


/* =========================================================
   STATUS PANEL
========================================================= */

function StatusPanel({
  icon: Icon,
  title,
  safe,
  children,
}) {
  return (
    <section
      className={`rounded-[28px] border p-6 ${
        safe
          ? "border-emerald-200 bg-emerald-50/80"
          : "border-red-200 bg-red-50/80"
      }`}
    >

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              safe
                ? "bg-emerald-100"
                : "bg-red-100"
            }`}
          >
            <Icon
              className={`h-5 w-5 ${
                safe
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            />
          </div>

          <div>
            <h3 className="font-black">
              {title}
            </h3>
          </div>

        </div>


        {safe ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
        ) : (
          <ShieldAlert className="h-5 w-5 text-red-700" />
        )}

      </div>


      <div className="mt-5 space-y-3">
        {children}
      </div>

    </section>
  );
}


/* =========================================================
   STATUS ROW
========================================================= */

function StatusRow({
  label,
  value,
  bad = false,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3">

      <span className="text-sm text-[#70665D]">
        {label}
      </span>

      <span
        className={`font-black ${
          bad
            ? "text-red-700"
            : "text-[#2D2A26]"
        }`}
      >
        {value}
      </span>

    </div>
  );
}