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
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  LoaderCircle,
  Plug,
  RadioTower,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Trash2,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  connectRFID,
  disconnectRFID,
  getProcedure,
  getProcedureInstruments,
  getRFIDStatus,
  registerProcedureInstrument,
  removeProcedureInstrument,
  scanRFID,
  updateProcedureStatus,
} from "../services/api";

import {
  getCurrentProcedureId,
  getCurrentUser,
} from "../utils/demoStore";


export default function RFIDRegistration() {
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
    instruments,
    setInstruments,
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
    loading,
    setLoading,
  ] = useState(true);

  const [
    connecting,
    setConnecting,
  ] = useState(false);

  const [
    scanning,
    setScanning,
  ] = useState(false);

  const [
    confirming,
    setConfirming,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");


  /* =========================================================
     NORMALIZE PROCEDURE INSTRUMENT RESPONSE
  ========================================================= */

  const normalizeInstrument = (
    item
  ) => {
    return {
      linkId:
        item?.link_id ??
        item?.id ??
        null,

      procedureId:
        item?.procedure_id ??
        procedureId,

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
        "",

      expected:
        item?.expected ??
        true,

      detected:
        item?.detected ??
        false,

      timeIn:
        item?.time_in ??
        null,

      timeOut:
        item?.time_out ??
        null,
    };
  };


  /* =========================================================
     LOAD PROCEDURE + RFID LIST
  ========================================================= */

  const loadProcedureData =
    useCallback(
      async () => {
        if (!procedureId) {
          setLoading(false);

          setError(
            "No active procedure was found."
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

          setInstruments(
            list.map(
              normalizeInstrument
            )
          );
        } catch (
          loadError
        ) {
          console.error(
            "RFID registration load failed:",
            loadError
          );

          setError(
            loadError?.message ||
            "Unable to load procedure RFID data."
          );
        } finally {
          setLoading(false);
        }
      },
      [procedureId]
    );


  /* =========================================================
     LOAD RFID READER STATUS
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
        } catch (
          statusError
        ) {
          console.warn(
            "RFID status unavailable:",
            statusError
          );

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


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadProcedureData();
    loadReaderStatus();
  }, [
    loadProcedureData,
    loadReaderStatus,
  ]);


  /* =========================================================
     CONNECT COM15
  ========================================================= */

  const handleConnect =
    async () => {
      if (connecting) {
        return;
      }

      setConnecting(true);
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
        console.error(
          "RFID connect failed:",
          connectError
        );

        setError(
          connectError?.message ||
          "Unable to connect to the RFID reader."
        );
      } finally {
        setConnecting(false);
      }
    };


  /* =========================================================
     DISCONNECT
  ========================================================= */

  const handleDisconnect =
    async () => {
      setError("");
      setMessage("");

      try {
        await disconnectRFID();

        setReaderStatus(
          (
            current
          ) => ({
            ...current,
            connected: false,
          })
        );

        setPendingScan(
          null
        );

        setMessage(
          "RFID reader disconnected."
        );
      } catch (
        disconnectError
      ) {
        setError(
          disconnectError?.message ||
          "Unable to disconnect RFID reader."
        );
      }
    };


  /* =========================================================
     SCAN RFID

     FastAPI:
     GET /rfid/scan

     Backend checks UID against
     master instruments database.
  ========================================================= */

  const handleScan =
    async () => {
      if (
        scanning ||
        !readerStatus.connected
      ) {
        return;
      }

      setScanning(true);
      setError("");
      setMessage("");
      setPendingScan(null);

      try {
        const result =
          await scanRFID();

        if (
          result?.status ===
          "pending_confirmation"
        ) {
          setPendingScan(
            result
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
              "unregistered UID"
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
          result?.status ===
          "waiting"
        ) {
          setMessage(
            "No RFID tag detected. Present the tag and scan again."
          );

          return;
        }

        setMessage(
          result?.message ||
          "No valid RFID instrument detected."
        );
      } catch (
        scanError
      ) {
        console.error(
          "RFID scan failed:",
          scanError
        );

        setError(
          scanError?.message ||
          "RFID scan failed."
        );
      } finally {
        setScanning(false);
      }
    };


  /* =========================================================
     CONFIRM RFID

     Only here does the frontend add
     the matched master instrument to
     the current procedure.
  ========================================================= */

  const confirmPendingScan =
    async () => {
      if (
        confirming ||
        !pendingScan?.rfid_uid ||
        !procedureId
      ) {
        return;
      }

      setConfirming(true);
      setError("");
      setMessage("");

      try {
        await registerProcedureInstrument(
          procedureId,
          pendingScan.rfid_uid
        );

        setMessage(
          `${
            pendingScan.instrument_name ||
            pendingScan.rfid_uid
          } confirmed for this procedure.`
        );

        setPendingScan(
          null
        );

        await loadProcedureData();
      } catch (
        confirmError
      ) {
        console.error(
          "RFID confirmation failed:",
          confirmError
        );

        /*
         * Some backends return a
         * duplicate message when the
         * instrument already belongs
         * to the procedure.
         *
         * Reload so frontend always
         * reflects backend truth.
         */

        try {
          await loadProcedureData();
        } catch {
          // Ignore secondary reload.
        }

        setError(
          confirmError?.message ||
          "Unable to confirm RFID instrument."
        );
      } finally {
        setConfirming(false);
      }
    };


  /* =========================================================
     REJECT PENDING RFID
  ========================================================= */

  const rejectPendingScan =
    () => {
      setPendingScan(
        null
      );

      setMessage(
        "RFID scan rejected. No procedure record was created."
      );
    };


  /* =========================================================
     REMOVE PROCEDURE INSTRUMENT
  ========================================================= */

  const removeInstrument =
    async (
      rfidUid
    ) => {
      if (
        !procedureId ||
        !rfidUid
      ) {
        return;
      }

      setError("");
      setMessage("");

      try {
        await removeProcedureInstrument(
          procedureId,
          rfidUid
        );

        setInstruments(
          (
            current
          ) =>
            current.filter(
              (
                item
              ) =>
                item.rfidUid !==
                rfidUid
            )
        );

        setMessage(
          "Instrument removed from this procedure."
        );
      } catch (
        removeError
      ) {
        setError(
          removeError?.message ||
          "Unable to remove instrument."
        );
      }
    };


  /* =========================================================
     CONTINUE TO PRE-OP
  ========================================================= */

  const continueToPreOp =
    async () => {
      if (
        instruments.length ===
        0
      ) {
        return;
      }

      try {
        await updateProcedureStatus(
          procedureId,
          "pre_op"
        );
      } catch (
        statusError
      ) {
        console.warn(
          "Pre-op status update failed:",
          statusError
        );
      }

      navigate(
        "/pre-op-scan"
      );
    };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">

        <div className="flex items-center gap-3 text-sm text-[#897D71]">

          <LoaderCircle className="h-5 w-5 animate-spin" />

          Loading procedure...

        </div>

      </div>
    );
  }


  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F0E8] text-[#2D2A26]">

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0">

        <motion.div
          animate={{
            scale: [
              1.03,
              1.07,
              1.03,
            ],
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
          }}
          className="absolute inset-0 bg-[url('/doctors-bg.jpg')] bg-cover bg-center"
          style={{
            opacity: 0.17,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/98 via-[#F5F0E8]/89 to-[#F5F0E8]/55" />

      </div>


      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="relative z-40 border-b border-[#DED5CA] bg-[#FAF7F2]/82 backdrop-blur-2xl">

        <div className="mx-auto flex h-[78px] max-w-[1600px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD2C5] bg-[#FFFDF9]"
            >

              <ArrowLeft className="h-4 w-4" />

            </button>


            <div className="flex items-center gap-3">

              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4C5B3] bg-[#FFFDF9]">

                <RadioTower className="h-5 w-5 text-[#9A724A]" />

                <span
                  className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${
                    readerStatus.connected
                      ? "animate-pulse bg-[#789477]"
                      : "bg-[#B86D61]"
                  }`}
                />

              </div>

              <div>

                <div className="text-sm font-semibold tracking-[0.14em]">
                  SURGITRACK
                </div>

                <div className="text-[10px] text-[#9D9287]">
                  RFID REGISTRATION
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

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6EEE4]">

              <UserRound className="h-4 w-4 text-[#9A724A]" />

            </div>

          </div>

        </div>

      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-9 lg:px-8">


        {/* TITLE */}

        <div className="mb-7">

          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A724A]">

            <RadioTower className="h-4 w-4" />

            Instrument RFID Registration

          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.035em] lg:text-4xl">
            Register procedure instruments
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#877D73]">
            Present each RFID-tagged instrument to the RC522 reader. SurgiTrack verifies the UID against the master instrument database before you confirm it for the procedure.
          </p>

        </div>


        {/* PROCEDURE BAR */}

        <div className="mb-6 flex flex-col justify-between gap-4 rounded-[20px] border border-[#DED3C6] bg-[#FFFDF9]/80 px-5 py-4 backdrop-blur-xl md:flex-row md:items-center">

          <div>

            <div className="text-sm font-semibold">

              {procedure?.case_id ||
                "No active case"}

            </div>

            <div className="mt-1 text-xs text-[#968B80]">

              {procedure?.ot_room ||
                "—"}

              {procedure?.procedure_name
                ? ` · ${procedure.procedure_name}`
                : ""}

            </div>

          </div>


          {/* HARDWARE STATUS */}

          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold ${
              readerStatus.connected
                ? "border-[#BFD0B9] bg-[#F2F8EF] text-[#688067]"
                : "border-[#E0C9C2] bg-[#FAF0ED] text-[#A16359]"
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


        {/* MESSAGE */}

        {error && (

          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#E3C6BF] bg-[#FBF0ED] px-4 py-3 text-xs leading-5 text-[#A15E54]">

            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />

            {error}

          </div>

        )}


        {message && !error && (

          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#C9D8C4] bg-[#F3F8F0] px-4 py-3 text-xs leading-5 text-[#698067]">

            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

            {message}

          </div>

        )}


        <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">


          {/* =================================================
              RFID SCANNER
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              x: -20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            className="rounded-[28px] border border-[#D8CCBE] bg-[#FFFDF9]/86 p-7 shadow-[0_20px_55px_rgba(80,62,42,.07)] backdrop-blur-xl"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#98704A]">
                  RFID Checkpoint
                </div>

                <h2 className="mt-2 text-xl font-semibold">
                  RC522 reader
                </h2>

              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  readerStatus.connected
                    ? "bg-[#E5EFE2]"
                    : "bg-[#F1DDD8]"
                }`}
              >

                {readerStatus.connected ? (
                  <Wifi className="h-4 w-4 text-[#698067]" />
                ) : (
                  <WifiOff className="h-4 w-4 text-[#AA6258]" />
                )}

              </div>

            </div>


            <div className="mt-3 text-sm leading-6 text-[#8C8278]">

              Port:
              {" "}
              <span className="font-semibold text-[#62584F]">
                {readerStatus.port}
              </span>

              {" · "}

              {readerStatus.baudrate}
              {" baud"}

            </div>


            {/* RFID ANIMATION */}

            <div className="relative mx-auto my-8 flex h-[250px] items-center justify-center">

              {[
                0,
                1,
                2,
              ].map(
                (
                  ring
                ) => (

                  <motion.div
                    key={
                      ring
                    }
                    animate={
                      readerStatus.connected
                        ? {
                            scale: [
                              0.9,
                              1.25,
                              0.9,
                            ],

                            opacity: [
                              0.25,
                              0.04,
                              0.25,
                            ],
                          }
                        : {
                            opacity:
                              0.08,
                          }
                    }
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay:
                        ring *
                        0.55,
                    }}
                    className="absolute rounded-full border border-[#B79067]"
                    style={{
                      width:
                        125 +
                        ring *
                          52,

                      height:
                        125 +
                        ring *
                          52,
                    }}
                  />

                )
              )}

              <motion.div
                animate={
                  readerStatus.connected
                    ? {
                        y: [
                          0,
                          -6,
                          0,
                        ],
                      }
                    : {}
                }
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[32px] border border-[#D0BEA9] bg-[#F7EEE4]"
              >

                {scanning ? (

                  <LoaderCircle className="h-11 w-11 animate-spin text-[#9A7149]" />

                ) : (

                  <ScanLine className="h-11 w-11 text-[#9A7149]" />

                )}

              </motion.div>

            </div>


            {/* CONNECTION CONTROLS */}

            {!readerStatus.connected ? (

              <motion.button
                onClick={
                  handleConnect
                }
                disabled={
                  connecting
                }
                whileHover={
                  !connecting
                    ? {
                        y: -2,
                      }
                    : {}
                }
                className={`flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white ${
                  connecting
                    ? "cursor-wait bg-[#B49A80]"
                    : "bg-[#A27A53]"
                }`}
              >

                {connecting ? (

                  <span className="flex items-center gap-3">

                    <LoaderCircle className="h-4 w-4 animate-spin" />

                    Connecting COM15...

                  </span>

                ) : (

                  <span className="flex items-center gap-3">

                    <Plug className="h-4 w-4" />

                    Connect RFID Reader

                  </span>

                )}

              </motion.button>

            ) : (

              <div className="space-y-3">

                <motion.button
                  onClick={
                    handleScan
                  }
                  disabled={
                    scanning ||
                    Boolean(
                      pendingScan
                    )
                  }
                  whileHover={
                    !scanning &&
                    !pendingScan
                      ? {
                          y: -2,
                        }
                      : {}
                  }
                  className={`button-sheen relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-white ${
                    scanning ||
                    pendingScan
                      ? "cursor-wait bg-[#B49A80]"
                      : "bg-[#A27A53]"
                  }`}
                >

                  <span className="relative z-10 flex items-center gap-3">

                    {scanning ? (
                      <>

                        <LoaderCircle className="h-4 w-4 animate-spin" />

                        Waiting for RFID...

                      </>
                    ) : (
                      <>

                        <RadioTower className="h-4 w-4" />

                        Scan Instrument

                      </>
                    )}

                  </span>

                </motion.button>


                <button
                  type="button"
                  onClick={
                    handleDisconnect
                  }
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#DDD2C5] bg-[#FFFDF9] text-xs text-[#877A70]"
                >

                  <WifiOff className="h-3.5 w-3.5" />

                  Disconnect Reader

                </button>

              </div>

            )}


            {/* =================================================
                PENDING CONFIRMATION
            ================================================= */}

            <AnimatePresence>

              {pendingScan && (

                <motion.div
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
                  className="mt-6 overflow-hidden rounded-[22px] border border-[#C8D5C2] bg-[#F3F8F0]"
                >

                  <div className="border-b border-[#DCE7D8] px-5 py-4">

                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#789176]">
                      Master DB Match
                    </div>

                    <div className="mt-2 text-lg font-semibold">

                      {pendingScan.instrument_name ||
                        "Instrument"}

                    </div>

                    <div className="mt-1 font-mono text-xs text-[#6F7C6D]">

                      {pendingScan.rfid_uid}

                    </div>

                  </div>


                  <div className="px-5 py-4">

                    <div className="grid gap-3 sm:grid-cols-2">

                      <MiniDetail
                        label="Type"
                        value={
                          pendingScan.instrument_type ||
                          "—"
                        }
                      />

                      <MiniDetail
                        label="Inventory"
                        value={
                          pendingScan.inventory_status ||
                          "—"
                        }
                      />

                    </div>


                    <div className="mt-4 flex gap-3">

                      <button
                        type="button"
                        onClick={
                          rejectPendingScan
                        }
                        disabled={
                          confirming
                        }
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#DDD3C8] bg-[#FFFDF9] text-sm font-medium"
                      >

                        <X className="h-4 w-4" />

                        Reject

                      </button>


                      <button
                        type="button"
                        onClick={
                          confirmPendingScan
                        }
                        disabled={
                          confirming
                        }
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#789477] text-sm font-semibold text-white"
                      >

                        {confirming ? (

                          <LoaderCircle className="h-4 w-4 animate-spin" />

                        ) : (

                          <CheckCircle2 className="h-4 w-4" />

                        )}

                        Confirm

                      </button>

                    </div>

                  </div>

                </motion.div>

              )}

            </AnimatePresence>

          </motion.section>


          {/* =================================================
              REGISTERED INSTRUMENTS
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            className="overflow-hidden rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/86 shadow-[0_20px_55px_rgba(80,62,42,.06)] backdrop-blur-xl"
          >

            <div className="flex items-center justify-between border-b border-[#E8E0D7] px-6 py-5">

              <div>

                <h2 className="font-semibold">
                  Procedure instruments
                </h2>

                <p className="mt-1 text-xs text-[#958B81]">
                  Confirmed against the SurgiTrack master database
                </p>

              </div>


              <div className="flex items-center gap-3">

                <button
                  type="button"
                  onClick={
                    loadProcedureData
                  }
                  title="Refresh"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD2C7]"
                >

                  <RefreshCw className="h-4 w-4" />

                </button>


                <div className="rounded-full bg-[#F2E8DC] px-4 py-2 text-sm font-semibold text-[#94704E]">

                  {instruments.length}

                  <span className="ml-1 text-xs font-normal">
                    registered
                  </span>

                </div>

              </div>

            </div>


            {instruments.length ===
            0 ? (

              <div className="flex min-h-[430px] flex-col items-center justify-center px-8 text-center">

                <Database className="h-8 w-8 text-[#A27A53]" />

                <h3 className="mt-5 font-semibold">
                  No instruments registered
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-[#988E84]">
                  Connect the RFID reader and scan every instrument required for this procedure.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-[#EDE5DC]">

                <AnimatePresence>

                  {instruments.map(
                    (
                      instrument,
                      index
                    ) => (

                      <motion.div
                        key={
                          instrument.rfidUid ||
                          index
                        }
                        initial={{
                          opacity: 0,
                          y: -8,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="grid gap-4 px-6 py-5 md:grid-cols-[1.1fr_1fr_.8fr_auto] md:items-center"
                      >

                        <div>

                          <div className="text-[10px] uppercase tracking-[0.12em] text-[#9C9288]">
                            Instrument
                          </div>

                          <div className="mt-1 text-sm font-semibold">
                            {instrument.name}
                          </div>

                          <div className="mt-1 text-[10px] text-[#9A9085]">
                            {instrument.instrumentType ||
                              "Surgical instrument"}
                          </div>

                        </div>


                        <div>

                          <div className="text-[10px] uppercase tracking-[0.12em] text-[#9C9288]">
                            RFID UID
                          </div>

                          <div className="mt-1 font-mono text-xs font-semibold">
                            {instrument.rfidUid ||
                              "—"}
                          </div>

                        </div>


                        <div>

                          <div className="text-[10px] uppercase tracking-[0.12em] text-[#9C9288]">
                            Status
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-xs text-[#698067]">

                            <CheckCircle2 className="h-3.5 w-3.5" />

                            Confirmed

                          </div>

                        </div>


                        <button
                          type="button"
                          title="Remove instrument"
                          onClick={() =>
                            removeInstrument(
                              instrument.rfidUid
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#B1A69B] transition hover:bg-[#FAECE8] hover:text-[#B8665B]"
                        >

                          <Trash2 className="h-4 w-4" />

                        </button>

                      </motion.div>

                    )
                  )}

                </AnimatePresence>

              </div>

            )}


            {/* CONTINUE */}

            <div className="border-t border-[#E7DED4] bg-[#FBF8F3]/75 p-5">

              <motion.button
                disabled={
                  instruments.length ===
                  0
                }
                onClick={
                  continueToPreOp
                }
                whileHover={
                  instruments.length >
                  0
                    ? {
                        y: -2,
                      }
                    : {}
                }
                className={`flex h-13 w-full items-center justify-center rounded-xl text-sm font-semibold ${
                  instruments.length >
                  0
                    ? "button-sheen relative overflow-hidden bg-[#A27A53] text-white"
                    : "cursor-not-allowed bg-[#E7DFD6] text-[#AAA096]"
                }`}
              >

                <span className="relative z-10 flex items-center gap-3">

                  Continue to Pre-Op Scan

                  <ArrowRight className="h-4 w-4" />

                </span>

              </motion.button>

            </div>

          </motion.section>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   SMALL DETAIL
========================================================= */

function MiniDetail({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-[#DDE6D9] bg-[#FBFDF9] p-3">

      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#859282]">
        {label}
      </div>

      <div className="mt-1 text-xs font-medium text-[#586356]">
        {value || "—"}
      </div>

    </div>
  );
}