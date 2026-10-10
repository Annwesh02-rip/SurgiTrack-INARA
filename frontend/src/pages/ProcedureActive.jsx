import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  HeartPulse,
  LoaderCircle,
  Plug,
  RadioTower,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  connectRFID,
  getProcedure,
  getProcedureInstruments,
  getRFIDStatus,
  scanRFID,
  updateProcedureStatus,
} from "../services/api";

import {
  getCurrentProcedureId,
  getCurrentUser,
} from "../utils/demoStore";


/* =========================================================
   FRONTEND RFID MOVEMENT STORAGE

   Backend is not changed.

   These records are shared with the Post-Op page later.
========================================================= */

function timingKey(
  procedureId
) {
  return `surgitrack_procedure_${procedureId}_rfid_timing`;
}


function readTiming(
  procedureId
) {
  if (!procedureId) {
    return [];
  }

  try {
    const raw =
      localStorage.getItem(
        timingKey(
          procedureId
        )
      );

    return raw
      ? JSON.parse(
          raw
        )
      : [];
  } catch (
    error
  ) {
    console.error(
      "Unable to read RFID timing:",
      error
    );

    return [];
  }
}


function saveTiming(
  procedureId,
  records
) {
  if (!procedureId) {
    return;
  }

  localStorage.setItem(
    timingKey(
      procedureId
    ),
    JSON.stringify(
      records
    )
  );
}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",
    }
  );
}


/* =========================================================
   NORMALIZE BACKEND PROCEDURE INSTRUMENT
========================================================= */

function normalizeInstrument(
  item
) {
  return {
    rfidUid:
      item?.rfid_uid ??
      item?.instrument_rfid_uid ??
      item?.instrument?.rfid_uid ??
      "",

    name:
      item?.name ??
      item?.instrument_name ??
      item?.instrument?.name ??
      "Unknown instrument",

    instrumentType:
      item?.instrument_type ??
      item?.instrument?.instrument_type ??
      "Surgical Instrument",

    backendTimeIn:
      item?.time_in ??
      null,

    backendTimeOut:
      item?.time_out ??
      null,
  };
}


export default function ProcedureActive() {
  const navigate =
    useNavigate();

  const user =
    getCurrentUser();

  const procedureId =
    getCurrentProcedureId();


  const [
    procedure,
    setProcedure,
  ] = useState(null);

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    readerStatus,
    setReaderStatus,
  ] = useState({
    connected: false,
    port: "COM15",
    baudrate: 9600,
  });

  const [
    pendingScan,
    setPendingScan,
  ] = useState(null);

  const [
    scanning,
    setScanning,
  ] = useState(false);

  const [
    connecting,
    setConnecting,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");


  /* =========================================================
     LOAD PROCEDURE + INSTRUMENTS
  ========================================================= */

  const loadData =
    useCallback(
      async () => {
        if (!procedureId) {
          setError(
            "No active procedure found."
          );

          setLoading(
            false
          );

          return;
        }

        try {
          const [
            procedureResult,
            instrumentResult,
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
            procedureResult
          );

          const list =
            Array.isArray(
              instrumentResult
            )
              ? instrumentResult
              : instrumentResult?.items ||
                instrumentResult?.instruments ||
                [];

          const backendItems =
            list.map(
              normalizeInstrument
            );

          const stored =
            readTiming(
              procedureId
            );

          const startTime =
            new Date()
              .toISOString();

          /*
           * Every instrument registered
           * before surgery is considered
           * present at procedure start.
           *
           * If backend already supplied
           * time_in, that is preferred.
           */

          const merged =
            backendItems.map(
              (
                instrument
              ) => {
                const previous =
                  stored.find(
                    (
                      item
                    ) =>
                      item.rfidUid ===
                      instrument.rfidUid
                  );

                if (
                  previous
                ) {
                  return {
                    ...instrument,
                    ...previous,

                    name:
                      instrument.name,

                    instrumentType:
                      instrument.instrumentType,
                  };
                }

                return {
                  ...instrument,

                  timeIn:
                    instrument.backendTimeIn ||
                    startTime,

                  timeOut:
                    instrument.backendTimeOut ||
                    null,

                  currentState:
                    instrument.backendTimeOut
                      ? "OUT"
                      : "IN",

                  events: [
                    {
                      type:
                        "IN",

                      timestamp:
                        instrument.backendTimeIn ||
                        startTime,

                      source:
                        "pre_op",
                    },
                  ],

                  postOpVerified:
                    false,
                };
              }
            );

          saveTiming(
            procedureId,
            merged
          );

          setRecords(
            merged
          );

          try {
            await updateProcedureStatus(
              procedureId,
              "active"
            );
          } catch (
            statusError
          ) {
            console.warn(
              "Active status update failed:",
              statusError
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            "Procedure load failed:",
            loadError
          );

          setError(
            loadError?.message ||
            "Unable to load active procedure."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        procedureId,
      ]
    );


  /* =========================================================
     LOAD RFID STATUS
  ========================================================= */

  const loadReaderStatus =
    useCallback(
      async () => {
        try {
          const result =
            await getRFIDStatus();

          setReaderStatus({
            connected:
              Boolean(
                result?.connected
              ),

            port:
              result?.port ||
              "COM15",

            baudrate:
              result?.baudrate ||
              9600,
          });
        } catch {
          setReaderStatus(
            (
              current
            ) => ({
              ...current,
              connected: false,
            })
          );
        }
      },
      []
    );


  useEffect(() => {
    loadData();
    loadReaderStatus();
  }, [
    loadData,
    loadReaderStatus,
  ]);


  /* =========================================================
     CONNECT RFID READER
  ========================================================= */

  const handleConnect =
    async () => {
      if (connecting) {
        return;
      }

      setConnecting(
        true
      );

      setError("");
      setMessage("");

      try {
        const result =
          await connectRFID();

        setReaderStatus({
          connected:
            Boolean(
              result?.connected
            ),

          port:
            result?.port ||
            "COM15",

          baudrate:
            result?.baudrate ||
            9600,
        });

        setMessage(
          `RFID reader connected on ${
            result?.port ||
            "COM15"
          }.`
        );
      } catch (
        connectError
      ) {
        setError(
          connectError?.message ||
          "Unable to connect RFID reader."
        );
      } finally {
        setConnecting(
          false
        );
      }
    };


  /* =========================================================
     SCAN DURING PROCEDURE
  ========================================================= */

  const handleScan =
    async () => {
      if (
        scanning ||
        pendingScan ||
        !readerStatus.connected
      ) {
        return;
      }

      setScanning(
        true
      );

      setError("");
      setMessage("");

      try {
        const result =
          await scanRFID();

        if (
          result?.status ===
          "waiting"
        ) {
          setMessage(
            "No RFID tag detected. Present the instrument and scan again."
          );

          return;
        }

        if (
          result?.status ===
          "unknown"
        ) {
          setError(
            `Unknown RFID tag: ${
              result?.rfid_uid ||
              "not registered"
            }`
          );

          return;
        }

        if (
          result?.status ===
          "inactive"
        ) {
          setError(
            `${
              result?.instrument_name ||
              "Instrument"
            } is inactive in the master database.`
          );

          return;
        }

        if (
          result?.status !==
          "pending_confirmation"
        ) {
          setMessage(
            result?.message ||
            "No valid RFID instrument detected."
          );

          return;
        }

        const uid =
          result?.rfid_uid;

        const registered =
          records.find(
            (
              item
            ) =>
              item.rfidUid ===
              uid
          );

        /*
         * Instrument exists in the
         * master DB but was NOT part
         * of this procedure.
         */

        if (
          !registered
        ) {
          setError(
            `${
              result?.instrument_name ||
              uid
            } is not registered for this procedure.`
          );

          return;
        }

        setPendingScan({
          ...result,

          currentState:
            registered.currentState,

          nextState:
            registered.currentState ===
            "IN"
              ? "OUT"
              : "IN",
        });
      } catch (
        scanError
      ) {
        console.error(
          "Live RFID scan failed:",
          scanError
        );

        setError(
          scanError?.message ||
          "RFID scan failed."
        );
      } finally {
        setScanning(
          false
        );
      }
    };


  /* =========================================================
     CONFIRM MOVEMENT

     IN  -> OUT
     OUT -> IN
  ========================================================= */

  const confirmMovement =
    () => {
      if (
        !pendingScan?.rfid_uid
      ) {
        return;
      }

      const now =
        new Date()
          .toISOString();

      const uid =
        pendingScan.rfid_uid;

      const updated =
        records.map(
          (
            instrument
          ) => {
            if (
              instrument.rfidUid !==
              uid
            ) {
              return instrument;
            }

            /*
             * Instrument currently
             * inside OT/procedure.
             *
             * New scan means it leaves
             * checkpoint -> Time Out.
             */

            if (
              instrument.currentState ===
              "IN"
            ) {
              return {
                ...instrument,

                timeOut:
                  now,

                currentState:
                  "OUT",

                events: [
                  ...(
                    instrument.events ||
                    []
                  ),

                  {
                    type:
                      "OUT",

                    timestamp:
                      now,

                    source:
                      "procedure",
                  },
                ],
              };
            }

            /*
             * Instrument currently out.
             *
             * New scan means it comes
             * back through checkpoint.
             */

            return {
              ...instrument,

              timeIn:
                now,

              currentState:
                "IN",

              events: [
                ...(
                  instrument.events ||
                  []
                ),

                {
                  type:
                    "IN",

                  timestamp:
                    now,

                  source:
                    "procedure",
                },
              ],
            };
          }
        );

      setRecords(
        updated
      );

      saveTiming(
        procedureId,
        updated
      );

      const instrument =
        updated.find(
          (
            item
          ) =>
            item.rfidUid ===
            uid
        );

      setMessage(
        `${instrument?.name || uid} marked ${
          instrument?.currentState ===
          "IN"
            ? "IN"
            : "OUT"
        }.`
      );

      setPendingScan(
        null
      );
    };


  /* =========================================================
     REJECT MOVEMENT
  ========================================================= */

  const rejectMovement =
    () => {
      setPendingScan(
        null
      );

      setMessage(
        "RFID movement rejected. No timing change recorded."
      );
    };


  /* =========================================================
     START POST-OP
  ========================================================= */

  const startPostOp =
    async () => {
      setError("");
      setMessage("");

      try {
        await updateProcedureStatus(
          procedureId,
          "post_op"
        );
      } catch (
        statusError
      ) {
        console.warn(
          "Post-op status update failed:",
          statusError
        );
      }

      navigate(
        "/post-op-scan"
      );
    };


  /* =========================================================
     COUNTS
  ========================================================= */

  const insideCount =
    records.filter(
      (
        item
      ) =>
        item.currentState ===
        "IN"
    ).length;

  const outsideCount =
    records.filter(
      (
        item
      ) =>
        item.currentState ===
        "OUT"
    ).length;


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">

        <div className="flex items-center gap-3 text-sm text-[#887C70]">

          <LoaderCircle className="h-5 w-5 animate-spin" />

          Loading active procedure...

        </div>

      </div>
    );
  }


  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F0E8] text-[#2D2A26]">

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <motion.div
          initial={{
            scale: 1.03,
          }}
          animate={{
            scale: [
              1.03,
              1.07,
              1.03,
            ],

            x: [
              0,
              8,
              0,
            ],
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-[url('/doctors-bg.jpg')] bg-cover bg-center"
          style={{
            opacity: 0.2,

            filter:
              "saturate(.68) contrast(.93) brightness(1.04)",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/97 via-[#F5F0E8]/84 to-[#F5F0E8]/55" />

        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F0E8]/30 via-transparent to-[#F5F0E8]/78" />

      </div>


      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="relative z-40 border-b border-[#DED5CA] bg-[#FAF7F2]/82 backdrop-blur-2xl">

        <div className="mx-auto flex h-[78px] max-w-[1600px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-4">

            <motion.button
              whileHover={{
                x: -3,
              }}
              onClick={() =>
                navigate(
                  "/pre-op-scan"
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD2C5] bg-[#FFFDF9]"
            >

              <ArrowLeft className="h-4 w-4" />

            </motion.button>


            <div className="flex items-center gap-3">

              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4C5B3] bg-[#FFFDF9]">

                <Activity className="h-5 w-5 text-[#9A724A]" />

                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-[#789477]" />

              </div>

              <div>

                <div className="text-sm font-semibold tracking-[0.14em]">
                  SURGITRACK
                </div>

                <div className="text-[10px] text-[#9D9287]">
                  PROCEDURE ACTIVE
                </div>

              </div>

            </div>

          </div>


          <div className="hidden items-center gap-3 sm:flex">

            <div className="text-right">

              <div className="text-sm font-medium">
                {user.name}
              </div>

              <div className="text-[11px] text-[#968C82]">

                {user.employeeId}

                {" · "}

                {user.role}

              </div>

            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D2C3B1] bg-[#F6EEE4]">

              <UserRound className="h-4 w-4 text-[#9A724A]" />

            </div>

          </div>

        </div>

      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-9 lg:px-8">


        {/* HERO */}

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>

            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6D846B]">

              <span className="relative flex h-3 w-3">

                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#789378]/40" />

                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#789378]" />

              </span>

              Live Procedure

            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.035em] lg:text-4xl">
              Procedure in progress
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#877D73]">
              Scan an instrument whenever it crosses the OT checkpoint. SurgiTrack updates its live Time In and Time Out.
            </p>

          </div>


          {/* READER STATUS */}

          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold ${
              readerStatus.connected
                ? "border-[#BDD0B8] bg-[#F2F8EF] text-[#698067]"
                : "border-[#E0C8C1] bg-[#FAF0ED] text-[#A15E54]"
            }`}
          >

            {readerStatus.connected ? (

              <Wifi className="h-3.5 w-3.5" />

            ) : (

              <WifiOff className="h-3.5 w-3.5" />

            )}

            {readerStatus.connected
              ? `${readerStatus.port} CONNECTED`
              : "RFID DISCONNECTED"}

          </div>

        </div>


        {/* ACTIVE CASE */}

        <div className="mt-7 flex flex-col justify-between gap-4 rounded-[22px] border border-[#C9D5C4] bg-[#F4F8F1]/88 px-6 py-5 md:flex-row md:items-center">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E1ECDE]">

              <HeartPulse className="h-6 w-6 text-[#6E886C]" />

            </div>

            <div>

              <div className="text-sm font-semibold text-[#536852]">
                Active surgical procedure
              </div>

              <div className="mt-1 text-xs text-[#81917F]">

                {procedure?.case_id ||
                  "Case not specified"}

                {procedure?.ot_room
                  ? ` · ${procedure.ot_room}`
                  : ""}

              </div>

            </div>

          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#BCD0B7] bg-[#F6FBF4] px-4 py-2 text-[11px] font-semibold text-[#658063]">

            <span className="h-2 w-2 animate-pulse rounded-full bg-[#759273]" />

            PROCEDURE ACTIVE

          </div>

        </div>


        {/* MESSAGES */}

        {error && (

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E3C6BF] bg-[#FBF0ED] px-4 py-3 text-xs text-[#A15E54]">

            <ShieldAlert className="h-4 w-4 shrink-0" />

            {error}

          </div>

        )}


        {message && !error && (

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#C8D7C2] bg-[#F3F8F0] px-4 py-3 text-xs text-[#698067]">

            <CheckCircle2 className="h-4 w-4 shrink-0" />

            {message}

          </div>

        )}


        {/* ===================================================
            STATUS CARDS
        =================================================== */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatusCard
            icon={
              Stethoscope
            }
            title="Registered"
            value={
              String(
                records.length
              ).padStart(
                2,
                "0"
              )
            }
          />

          <StatusCard
            icon={
              RadioTower
            }
            title="Currently In"
            value={
              String(
                insideCount
              ).padStart(
                2,
                "0"
              )
            }
            success
          />

          <StatusCard
            icon={
              ScanLine
            }
            title="Currently Out"
            value={
              String(
                outsideCount
              ).padStart(
                2,
                "0"
              )
            }
          />

          <StatusCard
            icon={
              Clock3
            }
            title="Current Stage"
            value="In Progress"
            success
          />

        </div>


        {/* ===================================================
            BODY
        =================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">


          {/* =================================================
              LIVE RFID TABLE
          ================================================= */}

          <section className="overflow-hidden rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/90 shadow-[0_20px_55px_rgba(80,62,42,.06)]">

            <div className="flex flex-col justify-between gap-4 border-b border-[#E8E0D7] px-6 py-5 md:flex-row md:items-center">

              <div>

                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#98704A]">
                  Live RFID Tracking
                </div>

                <h2 className="mt-2 text-xl font-semibold">
                  Instrument movement
                </h2>

                <p className="mt-1 text-xs text-[#958B81]">
                  RFID No. · Instrument · Time In · Time Out
                </p>

              </div>


              <button
                type="button"
                onClick={
                  loadData
                }
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#DDD2C5] bg-[#FFFDF9] px-4 text-xs"
              >

                <RefreshCw className="h-3.5 w-3.5" />

                Refresh

              </button>

            </div>


            {records.length ===
            0 ? (

              <div className="p-10 text-center text-sm text-[#958A80]">
                No instruments registered for this procedure.
              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full min-w-[780px] border-collapse">

                  <thead className="bg-[#F8F3ED]">

                    <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#90857A]">

                      <th className="px-5 py-4">
                        RFID No.
                      </th>

                      <th className="px-5 py-4">
                        Instrument
                      </th>

                      <th className="px-5 py-4">
                        Time In
                      </th>

                      <th className="px-5 py-4">
                        Time Out
                      </th>

                      <th className="px-5 py-4">
                        Status
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-[#ECE4DB]">

                    {records.map(
                      (
                        instrument
                      ) => (

                        <tr
                          key={
                            instrument.rfidUid
                          }
                          className="transition hover:bg-[#FBF8F4]"
                        >

                          <td className="px-5 py-4">

                            <div className="font-mono text-xs font-semibold">
                              {instrument.rfidUid}
                            </div>

                          </td>

                          <td className="px-5 py-4">

                            <div className="text-sm font-semibold">
                              {instrument.name}
                            </div>

                            <div className="mt-1 text-[10px] text-[#9B9187]">
                              {instrument.instrumentType}
                            </div>

                          </td>

                          <td className="px-5 py-4 text-xs">
                            {formatTime(
                              instrument.timeIn
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs">
                            {formatTime(
                              instrument.timeOut
                            )}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                                instrument.currentState ===
                                "IN"
                                  ? "bg-[#E6F0E2] text-[#668064]"
                                  : "bg-[#FAECE8] text-[#A46158]"
                              }`}
                            >

                              <span
                                className={`h-2 w-2 rounded-full ${
                                  instrument.currentState ===
                                  "IN"
                                    ? "bg-[#789477]"
                                    : "bg-[#B86B60]"
                                }`}
                              />

                              {instrument.currentState}

                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </section>


          {/* =================================================
              RFID CHECKPOINT
          ================================================= */}

          <div className="space-y-6">

            <section className="rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/90 p-6">

              <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#98704A]">
                RFID Checkpoint
              </div>

              <h2 className="mt-2 text-lg font-semibold">
                Instrument movement
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#8D8278]">
                Scan an instrument as it leaves or returns to the operating theatre.
              </p>


              <div className="mt-6 flex h-32 items-center justify-center rounded-[22px] border border-dashed border-[#D8CCBF] bg-[#FAF7F2]">

                {scanning ? (

                  <LoaderCircle className="h-9 w-9 animate-spin text-[#A27A53]" />

                ) : (

                  <RadioTower
                    className={`h-9 w-9 ${
                      readerStatus.connected
                        ? "text-[#789477]"
                        : "text-[#B5AAA0]"
                    }`}
                  />

                )}

              </div>


              {!readerStatus.connected ? (

                <button
                  type="button"
                  disabled={
                    connecting
                  }
                  onClick={
                    handleConnect
                  }
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#A27A53] text-sm font-semibold text-white disabled:opacity-60"
                >

                  {connecting ? (

                    <LoaderCircle className="h-4 w-4 animate-spin" />

                  ) : (

                    <Plug className="h-4 w-4" />

                  )}

                  {connecting
                    ? "Connecting..."
                    : "Connect RFID Reader"}

                </button>

              ) : (

                <button
                  type="button"
                  disabled={
                    scanning ||
                    Boolean(
                      pendingScan
                    )
                  }
                  onClick={
                    handleScan
                  }
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#A27A53] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {scanning ? (

                    <LoaderCircle className="h-4 w-4 animate-spin" />

                  ) : (

                    <RadioTower className="h-4 w-4" />

                  )}

                  {scanning
                    ? "Waiting for RFID..."
                    : "Scan Instrument"}

                </button>

              )}

            </section>


            {/* =================================================
                CONFIRM MOVEMENT
            ================================================= */}

            <AnimatePresence>

              {pendingScan && (

                <motion.section
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -8,
                  }}
                  className="rounded-[28px] border border-[#C7D5C1] bg-[#F3F8F0] p-6"
                >

                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#718A70]">
                    Confirm RFID Movement
                  </div>

                  <div className="mt-3 text-lg font-semibold">
                    {pendingScan.instrument_name}
                  </div>

                  <div className="mt-1 font-mono text-xs text-[#788676]">
                    {pendingScan.rfid_uid}
                  </div>


                  <div className="mt-5 rounded-xl border border-[#D6E2D2] bg-white/55 p-4">

                    <div className="text-[9px] uppercase tracking-wider text-[#849181]">
                      Movement
                    </div>

                    <div className="mt-2 text-sm font-semibold">

                      {pendingScan.currentState}

                      {"  →  "}

                      {pendingScan.nextState}

                    </div>

                  </div>


                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      onClick={
                        rejectMovement
                      }
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D5CCC1] bg-[#FFFDF9]"
                    >

                      <X className="h-4 w-4" />

                      Reject

                    </button>

                    <button
                      type="button"
                      onClick={
                        confirmMovement
                      }
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#789477] font-semibold text-white"
                    >

                      <CheckCircle2 className="h-4 w-4" />

                      Confirm

                    </button>

                  </div>

                </motion.section>

              )}

            </AnimatePresence>


            {/* NEXT STAGE */}

            <motion.button
              whileHover={{
                y: -3,
              }}
              whileTap={{
                scale: 0.985,
              }}
              onClick={
                startPostOp
              }
              className="button-sheen relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#A27A53] px-4 text-center text-sm font-semibold text-white"
            >

              <span className="relative z-10 flex items-center gap-3">

                Complete Procedure & Start Post-Op

                <ScanLine className="h-4 w-4" />

              </span>

            </motion.button>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/pre-op-scan"
                )
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D7CCBF] bg-[#FFFDF9]"
            >

              <ArrowLeft className="h-4 w-4" />

              Back to Pre-Op

            </button>

          </div>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   STATUS CARD
========================================================= */

function StatusCard({
  icon: Icon,
  title,
  value,
  success,
}) {
  return (
    <motion.div
      whileHover={{
        y: -4,
      }}
      className="rounded-[22px] border border-[#DED3C6] bg-[#FFFDF9]/86 p-5"
    >

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          success
            ? "bg-[#E5EFE2]"
            : "bg-[#F2E8DC]"
        }`}
      >

        <Icon
          className={`h-5 w-5 ${
            success
              ? "text-[#6F896E]"
              : "text-[#A27A53]"
          }`}
        />

      </div>

      <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#998F85]">
        {title}
      </div>

      <div className="mt-2 text-lg font-semibold">
        {value}
      </div>

    </motion.div>
  );
}