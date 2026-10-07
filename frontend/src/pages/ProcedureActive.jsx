import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  HeartPulse,
  RadioTower,
  ScanLine,
  Stethoscope,
  UserRound,
} from "lucide-react";

import {
  getCurrentProcedure,
  getCurrentUser,
  getRfidScans,
} from "../utils/demoStore";

export default function ProcedureActive() {
  const navigate = useNavigate();

  const user = getCurrentUser();
  const procedure = getCurrentProcedure();
  const scans = getRfidScans();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F0E8] text-[#2D2A26]">

      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          initial={{
            scale: 1.03,
          }}
          animate={{
            scale: [1.03, 1.07, 1.03],
            x: [0, 8, 0],
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

        <motion.div
          animate={{
            x: [0, 40, -15, 0],
            y: [0, -20, 15, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-40 top-20 h-[34rem] w-[34rem] rounded-full bg-[#E1CEB8]/30 blur-[120px]"
        />
      </div>

      {/* HEADER */}
      <header className="relative z-40 border-b border-[#DED5CA] bg-[#FAF7F2]/82 backdrop-blur-2xl">
        <div className="mx-auto flex h-[78px] max-w-[1600px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-4">

            <motion.button
              whileHover={{
                x: -3,
              }}
              onClick={() =>
                navigate("/pre-op-scan")
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD2C5] bg-[#FFFDF9] text-[#897D72] shadow-sm transition hover:text-[#5E554D]"
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
                {user.role}
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D2C3B1] bg-[#F6EEE4]">
              <UserRound className="h-4 w-4 text-[#9A724A]" />
            </div>

          </div>

        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 mx-auto max-w-[1450px] px-5 py-10 lg:px-8">

        {/* HERO */}
        <motion.section
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6D846B]">

            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#789378]/40" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#789378]" />
            </span>

            Live Procedure
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#302C28] lg:text-4xl">
            Procedure in progress
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#877D73]">
            SurgiTrack is maintaining the procedure session and
            registered instrument inventory.
          </p>
        </motion.section>

        {/* ACTIVE CASE BAR */}
        <motion.section
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
          }}
          className="mt-8 flex flex-col justify-between gap-4 rounded-[22px] border border-[#C9D5C4] bg-[#F4F8F1]/88 px-6 py-5 shadow-[0_16px_40px_rgba(73,93,70,.06)] backdrop-blur-xl md:flex-row md:items-center"
        >

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E1ECDE]">
              <HeartPulse className="h-6 w-6 text-[#6E886C]" />
            </div>

            <div>
              <div className="text-sm font-semibold text-[#536852]">
                Active surgical procedure
              </div>

              <div className="mt-1 text-xs text-[#81917F]">
                {procedure?.caseId || "Case not specified"}

                {procedure?.otRoom
                  ? ` · ${procedure.otRoom}`
                  : ""}
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#BCD0B7] bg-[#F6FBF4] px-4 py-2 text-[11px] font-semibold text-[#658063]">

            <span className="h-2 w-2 animate-pulse rounded-full bg-[#759273]" />

            PROCEDURE ACTIVE
          </div>

        </motion.section>

        {/* STATUS CARDS */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatusCard
            icon={Stethoscope}
            title="Procedure"
            value={
              procedure?.procedureName ||
              "Active"
            }
          />

          <StatusCard
            icon={RadioTower}
            title="RFID Registered"
            value={String(scans.length).padStart(
              2,
              "0"
            )}
          />

          <StatusCard
            icon={ScanLine}
            title="Pre-Op Vision"
            value="Captured"
            success
          />

          <StatusCard
            icon={Clock3}
            title="Current Stage"
            value="In Progress"
            success
          />

        </div>

        {/* BODY */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">

          {/* LEFT */}
          <motion.section
            initial={{
              opacity: 0,
              x: -20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: 0.2,
            }}
            className="rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/86 p-7 shadow-[0_20px_55px_rgba(80,62,42,.06)] backdrop-blur-xl"
          >

            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#98704A]">
              Procedure Information
            </div>

            <h2 className="mt-2 text-xl font-semibold text-[#39332E]">
              Active case details
            </h2>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">

              <InfoBox
                title="Case ID"
                value={
                  procedure?.caseId ||
                  "—"
                }
              />

              <InfoBox
                title="Operating Theatre"
                value={
                  procedure?.otRoom ||
                  "—"
                }
              />

              <InfoBox
                title="Procedure"
                value={
                  procedure?.procedureName ||
                  "—"
                }
              />

              <InfoBox
                title="Lead Surgeon"
                value={
                  procedure?.surgeon ||
                  "—"
                }
              />

            </div>

            {/* RFID */}
            <div className="mt-8 border-t border-[#E8E0D7] pt-6">

              <div className="flex items-center justify-between gap-4">

                <div>
                  <h3 className="text-sm font-semibold text-[#49413A]">
                    Registered RFID inventory
                  </h3>

                  <p className="mt-1 text-xs text-[#978D83]">
                    Instrument tags registered for this procedure
                  </p>
                </div>

                <div className="rounded-full bg-[#F2E8DC] px-4 py-2 text-sm font-semibold text-[#94704E]">
                  {scans.length}

                  <span className="ml-1 text-xs font-normal">
                    tags
                  </span>
                </div>

              </div>

              {scans.length === 0 ? (

                <div className="mt-5 rounded-2xl border border-dashed border-[#DDD2C5] bg-[#FAF6F0] px-5 py-8 text-center text-sm text-[#948A80]">
                  No RFID tags registered.
                </div>

              ) : (

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  {scans.map((scan) => (

                    <motion.div
                      key={scan.uid}
                      whileHover={{
                        y: -2,
                      }}
                      className="rounded-2xl border border-[#E2D9CF] bg-[#FAF7F2] p-4"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div>

                          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9C9288]">
                            RFID UID
                          </div>

                          <div className="mt-2 font-mono text-xs font-semibold text-[#4A433D]">
                            {scan.uid}
                          </div>

                        </div>

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0E5D8]">
                          <RadioTower className="h-4 w-4 text-[#A27A53]" />
                        </div>

                      </div>

                    </motion.div>

                  ))}

                </div>

              )}

            </div>

          </motion.section>

          {/* RIGHT */}
          <div className="space-y-6">

            {/* WORKFLOW */}
            <motion.section
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.25,
              }}
              className="rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/88 p-6 shadow-[0_20px_55px_rgba(80,62,42,.05)] backdrop-blur-xl"
            >

              <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#98704A]">
                Verification Workflow
              </div>

              <h2 className="mt-2 text-lg font-semibold">
                Procedure status
              </h2>

              <div className="mt-6">

                <WorkflowStep
                  number="01"
                  title="Procedure Setup"
                  complete
                />

                <WorkflowConnector />

                <WorkflowStep
                  number="02"
                  title="RFID Registration"
                  complete
                />

                <WorkflowConnector />

                <WorkflowStep
                  number="03"
                  title="Pre-Op Vision"
                  complete
                />

                <WorkflowConnector active />

                <WorkflowStep
                  number="04"
                  title="Procedure"
                  active
                />

                <WorkflowConnector />

                <WorkflowStep
                  number="05"
                  title="Post-Op Vision"
                />

                <WorkflowConnector />

                <WorkflowStep
                  number="06"
                  title="Final Reconciliation"
                />

              </div>

            </motion.section>

            {/* PREOP BASELINE */}
            <motion.section
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.35,
              }}
              className="rounded-[24px] border border-[#BED0B8] bg-[#F3F8F0]/92 p-6"
            >

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DFECDA]">
                  <CheckCircle2 className="h-5 w-5 text-[#6F896E]" />
                </div>

                <div>

                  <div className="text-sm font-semibold text-[#536A52]">
                    Pre-operative baseline recorded
                  </div>

                  <p className="mt-2 text-xs leading-5 text-[#788676]">
                    The procedure is operating with its registered
                    RFID inventory and pre-operative camera baseline.
                  </p>

                </div>

              </div>

            </motion.section>

            {/* NEXT STAGE */}
            <motion.button
              whileHover={{
                y: -3,
                scale: 1.01,
              }}
              whileTap={{
                scale: 0.985,
              }}
              onClick={() =>
                navigate("/post-op-scan")
              }
              className="button-sheen relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#A27A53] text-sm font-semibold text-white shadow-[0_14px_32px_rgba(139,99,60,.22)]"
            >

              <span className="relative z-10 flex items-center gap-3">

                Complete Procedure & Start Post-Op Scan

                <ScanLine className="h-4 w-4" />

              </span>

            </motion.button>

            {/* BACK */}
            <motion.button
              whileHover={{
                x: -2,
              }}
              onClick={() =>
                navigate("/pre-op-scan")
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D7CCBF] bg-[#FFFDF9]/88 text-sm font-medium text-[#776C61] backdrop-blur-xl"
            >

              <ArrowLeft className="h-4 w-4" />

              Back to Pre-Op Scan

            </motion.button>

          </div>

        </div>

      </main>

    </div>
  );
}

/* ------------------------------------------------
   STATUS CARD
------------------------------------------------ */

function StatusCard({
  icon: Icon,
  title,
  value,
  success,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -5,
      }}
      className="rounded-[22px] border border-[#DED3C6] bg-[#FFFDF9]/84 p-5 shadow-[0_14px_35px_rgba(82,64,45,.05)] backdrop-blur-xl"
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

      <div className="mt-2 truncate text-lg font-semibold text-[#403933]">
        {value}
      </div>

    </motion.div>
  );
}

/* ------------------------------------------------
   INFO BOX
------------------------------------------------ */

function InfoBox({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-[#E2D9CF] bg-[#FAF7F2] p-5">

      <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9C9288]">
        {title}
      </div>

      <div className="mt-2 text-sm font-medium text-[#49413A]">
        {value}
      </div>

    </div>
  );
}

/* ------------------------------------------------
   WORKFLOW
------------------------------------------------ */

function WorkflowStep({
  number,
  title,
  complete,
  active,
}) {
  return (
    <div className="flex items-center gap-4">

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
          complete
            ? "bg-[#798E76] text-white"
            : active
            ? "bg-[#A27A53] text-white shadow-[0_0_0_6px_rgba(162,122,83,.10)]"
            : "border border-[#D9CFC3] bg-[#FFFDF9] text-[#A0968B]"
        }`}
      >
        {complete ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          number
        )}
      </div>

      <div>

        <div
          className={`text-sm font-medium ${
            complete
              ? "text-[#637A61]"
              : active
              ? "text-[#634D39]"
              : "text-[#9A9086]"
          }`}
        >
          {title}
        </div>

        {active && (
          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#A27A53]">

            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A27A53]" />

            Current Stage

          </div>
        )}

      </div>

    </div>
  );
}

function WorkflowConnector({
  active,
}) {
  return (
    <div
      className={`ml-[17px] h-7 w-px ${
        active
          ? "bg-[#C6A783]"
          : "bg-[#DDD3C7]"
      }`}
    />
  );
}