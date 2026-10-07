import {
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
  Clock3,
  Database,
  RadioTower,
  ScanLine,
  Trash2,
  UserRound,
  Wifi,
} from "lucide-react";

import {
  addRfidScan,
  clearRfidScans,
  getCurrentProcedure,
  getCurrentUser,
  getRfidScans,
  removeRfidScan,
} from "../utils/demoStore";

function randomByte() {
  return Math.floor(
    Math.random() * 256
  )
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

function generateUid() {
  return [
    randomByte(),
    randomByte(),
    randomByte(),
    randomByte(),
  ].join(":");
}

export default function RFIDRegistration() {
  const navigate =
    useNavigate();

  const user =
    getCurrentUser();

  const procedure =
    getCurrentProcedure();

  const [scans, setScans] =
    useState([]);

  const [
    lastScan,
    setLastScan,
  ] = useState(null);

  const [
    message,
    setMessage,
  ] = useState("");

  useEffect(() => {
    setScans(
      getRfidScans()
    );
  }, []);

  const simulateScan = () => {
    let uid =
      generateUid();

    while (
      scans.some(
        (item) =>
          item.uid === uid
      )
    ) {
      uid =
        generateUid();
    }

    const scan = {
      uid,

      scannedAt:
        new Date().toISOString(),

      /*
       * IMPORTANT:
       * React does NOT assign
       * instrument name.
       *
       * Later FastAPI will return:
       *
       * instrument_id
       * instrument_code
       * instrument_name
       * category
       */
      instrument: null,

      resolution:
        "pending_db",
    };

    const result =
      addRfidScan(scan);

    setScans(
      result.scans
    );

    setLastScan(scan);

    setMessage("");
  };

  const remove = (uid) => {
    setScans(
      removeRfidScan(uid)
    );

    if (
      lastScan?.uid ===
      uid
    ) {
      setLastScan(null);
    }
  };

  const clear = () => {
    clearRfidScans();

    setScans([]);
    setLastScan(null);
  };

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

      {/* HEADER */}

      <header className="relative z-40 border-b border-[#DED5CA] bg-[#FAF7F2]/82 backdrop-blur-2xl">

        <div className="mx-auto flex h-[78px] max-w-[1600px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-4">

            <button
              onClick={() =>
                navigate(
                  "/new-procedure"
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD2C5] bg-[#FFFDF9]"
            >

              <ArrowLeft className="h-4 w-4" />

            </button>

            <div className="flex items-center gap-3">

              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4C5B3] bg-[#FFFDF9]">

                <RadioTower className="h-5 w-5 text-[#9A724A]" />

                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-[#789477]" />

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
                {user.role}
              </div>

            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6EEE4]">

              <UserRound className="h-4 w-4 text-[#9A724A]" />

            </div>

          </div>

        </div>

      </header>

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-9 lg:px-8">

        <div className="mb-7">

          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A724A]">

            <RadioTower className="h-4 w-4" />

            Instrument RFID Registration

          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.035em] lg:text-4xl">

            Register procedure instruments

          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#877D73]">

            Each detected RFID UID
            will eventually be resolved
            against the SurgiTrack
            instrument database through
            FastAPI.

          </p>

        </div>

        {/* PROCEDURE BAR */}

        <div className="mb-6 rounded-[20px] border border-[#DED3C6] bg-[#FFFDF9]/80 px-5 py-4 backdrop-blur-xl">

          <div className="text-sm font-semibold">
            {procedure?.caseId ||
              "No active case"}
          </div>

          <div className="mt-1 text-xs text-[#968B80]">

            {procedure?.otRoom ||
              "—"}

            {procedure?.procedureName
              ? ` · ${procedure.procedureName}`
              : ""}

          </div>

        </div>

        <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">

          {/* SCANNER */}

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

            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#98704A]">
              RFID Checkpoint
            </div>

            <h2 className="mt-2 text-xl font-semibold">
              Present RFID tag
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#8C8278]">

              Hardware integration will
              replace the simulation
              trigger below.

            </p>

            <div className="relative mx-auto my-8 flex h-[270px] items-center justify-center">

              {[
                0,
                1,
                2,
              ].map(
                (ring) => (

                  <motion.div
                    key={
                      ring
                    }
                    animate={{
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
                    }}
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
                        130 +
                        ring *
                          55,

                      height:
                        130 +
                        ring *
                          55,
                    }}
                  />

                )
              )}

              <motion.div
                animate={{
                  y: [
                    0,
                    -6,
                    0,
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[32px] border border-[#D0BEA9] bg-[#F7EEE4]"
              >

                <ScanLine className="h-11 w-11 text-[#9A7149]" />

              </motion.div>

            </div>

            <div className="text-center">

              <div className="text-sm font-medium text-[#776B60]">
                Waiting for RFID UID...
              </div>

              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-[#A0968A]">

                <Wifi className="h-3.5 w-3.5" />

                RC522 integration pending

              </div>

            </div>

            <motion.button
              onClick={
                simulateScan
              }
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale: 0.98,
              }}
              className="button-sheen relative mt-8 flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-[#A27A53] text-sm font-semibold text-white"
            >

              <span className="relative z-10 flex items-center gap-3">

                <RadioTower className="h-4 w-4" />

                Simulate RFID UID

              </span>

            </motion.button>

            <p className="mt-3 text-center text-[10px] leading-4 text-[#AAA095]">

              Temporary frontend
              simulation only.

            </p>

            <AnimatePresence>

              {lastScan && (

                <motion.div
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="mt-6 rounded-2xl border border-[#C8D5C2] bg-[#F3F8F0] p-4"
                >

                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#789176]">
                    UID Captured
                  </div>

                  <div className="mt-2 font-mono text-sm font-semibold">
                    {
                      lastScan.uid
                    }
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-[#7E8F7C]">

                    <Database className="h-3.5 w-3.5" />

                    Awaiting DB
                    instrument lookup

                  </div>

                </motion.div>

              )}

            </AnimatePresence>

          </motion.section>

          {/* LIST */}

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
                  Scanned RFID tags
                </h2>

                <p className="mt-1 text-xs text-[#958B81]">
                  Unlimited procedure
                  instrument scans
                </p>

              </div>

              <div className="flex items-center gap-3">

                <div className="rounded-full bg-[#F2E8DC] px-4 py-2 text-sm font-semibold text-[#94704E]">

                  {scans.length}

                  <span className="ml-1 text-xs font-normal">
                    scanned
                  </span>

                </div>

                {scans.length >
                  0 && (

                  <button
                    onClick={
                      clear
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD2C7]"
                  >

                    <Trash2 className="h-4 w-4" />

                  </button>

                )}

              </div>

            </div>

            {scans.length ===
            0 ? (

              <div className="flex min-h-[430px] flex-col items-center justify-center px-8 text-center">

                <RadioTower className="h-8 w-8 text-[#A27A53]" />

                <h3 className="mt-5 font-semibold">
                  No RFID tags
                  scanned yet
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-[#988E84]">

                  There is no fixed
                  instrument count.
                  Scan every instrument
                  required for the
                  procedure.

                </p>

              </div>

            ) : (

              <div className="divide-y divide-[#EDE5DC]">

                <AnimatePresence>

                  {scans.map(
                    (
                      scan,
                      index
                    ) => (

                      <motion.div
                        key={
                          scan.uid
                        }
                        initial={{
                          opacity: 0,
                          y: -8,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_.65fr_1fr_auto] md:items-center"
                      >

                        <div>

                          <div className="text-[10px] uppercase tracking-[0.12em] text-[#9C9288]">
                            RFID UID
                          </div>

                          <div className="mt-1 font-mono text-sm font-semibold">
                            {
                              scan.uid
                            }
                          </div>

                        </div>

                        <div>

                          <div className="text-[10px] uppercase tracking-[0.12em] text-[#9C9288]">
                            Scan
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-xs">

                            <Clock3 className="h-3.5 w-3.5" />

                            {new Date(
                              scan.scannedAt
                            ).toLocaleTimeString()}

                          </div>

                        </div>

                        <div>

                          <div className="text-[10px] uppercase tracking-[0.12em] text-[#9C9288]">
                            Instrument
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-xs text-[#8B765E]">

                            <Database className="h-3.5 w-3.5" />

                            Pending DB
                            lookup

                          </div>

                        </div>

                        <button
                          onClick={() =>
                            remove(
                              scan.uid
                            )
                          }
                          className="text-[#B1A69B] hover:text-[#B8665B]"
                        >

                          <Trash2 className="h-4 w-4" />

                        </button>

                      </motion.div>

                    )
                  )}

                </AnimatePresence>

              </div>

            )}

            <div className="border-t border-[#E7DED4] bg-[#FBF8F3]/75 p-5">

              <motion.button
                disabled={
                  scans.length ===
                  0
                }
                onClick={() =>
                  navigate(
                    "/pre-op-scan"
                  )
                }
                whileHover={
                  scans.length >
                  0
                    ? {
                        y: -2,
                      }
                    : {}
                }
                className={`flex h-13 w-full items-center justify-center rounded-xl text-sm font-semibold ${
                  scans.length >
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