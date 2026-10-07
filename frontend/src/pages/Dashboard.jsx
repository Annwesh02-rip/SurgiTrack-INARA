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
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  History,
  LogOut,
  MapPin,
  Plus,
  RadioTower,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";

import {
  clearCurrentUser,
  getCurrentProcedure,
  getCurrentUser,
  getProcedureHistory,
  getRfidScans,
  getVisionStatus,
} from "../utils/demoStore";

export default function Dashboard() {
  const navigate =
    useNavigate();

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "overview"
  );

  const [
    user,
    setUser,
  ] = useState(
    getCurrentUser()
  );

  const [
    procedure,
    setProcedure,
  ] = useState(
    getCurrentProcedure()
  );

  const [
    scans,
    setScans,
  ] = useState(
    getRfidScans()
  );

  const [
    vision,
    setVision,
  ] = useState(
    getVisionStatus()
  );

  const [
    history,
    setHistory,
  ] = useState(
    getProcedureHistory()
  );

  useEffect(() => {
    setUser(
      getCurrentUser()
    );

    setProcedure(
      getCurrentProcedure()
    );

    setScans(
      getRfidScans()
    );

    setVision(
      getVisionStatus()
    );

    setHistory(
      getProcedureHistory()
    );
  }, []);

  const historyStats =
    useMemo(() => {
      const instruments =
        history.reduce(
          (
            total,
            record
          ) =>
            total +
            Number(
              record.instrumentCount ||
                0
            ),
          0
        );

      const otRooms =
        new Set(
          history
            .map(
              (
                record
              ) =>
                record.otRoom
            )
            .filter(
              Boolean
            )
        );

      return {
        procedures:
          history.length,

        instruments,

        otRooms:
          otRooms.size,
      };
    }, [
      history,
    ]);

  const logout = () => {
    clearCurrentUser();

    navigate(
      "/",
      {
        replace: true,
      }
    );
  };

  const mainAction = () => {
    if (procedure) {
      navigate(
        "/rfid-registration"
      );

      return;
    }

    navigate(
      "/new-procedure"
    );
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
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-[url('/doctors-bg.jpg')] bg-cover bg-center"
          style={{
            opacity: 0.24,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/96 via-[#F5F0E8]/80 to-[#F5F0E8]/44" />

      </div>

      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-[#E1D8CC] bg-[#F8F4EE]/84 backdrop-blur-2xl">

        <div className="flex h-[78px] items-center justify-between px-6 lg:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D3C4B3] bg-[#FFFDF9]">

              <ScanLine className="h-5 w-5 text-[#9A724A]" />

            </div>

            <div>

              <div className="text-sm font-semibold tracking-[0.14em]">
                SURGITRACK
              </div>

              <div className="text-[10px] text-[#9C9288]">
                OT VERIFICATION SYSTEM
              </div>

            </div>

          </div>

          {/* USER */}

          <div className="flex items-center gap-4">

            <div className="hidden text-right sm:block">

              <div className="text-sm font-medium">
                {user.name}
              </div>

              <div className="text-[11px] text-[#968C82]">
                {user.employeeId} · {user.role}
              </div>

            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D2C3B1] bg-[#F6EEE4]">

              <UserRound className="h-4 w-4 text-[#9A724A]" />

            </div>

            <button
              onClick={
                logout
              }
              title="Logout"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DED4C8] bg-[#FFFDF9] text-[#968C82]"
            >

              <LogOut className="h-4 w-4" />

            </button>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="relative z-10 mx-auto max-w-[1550px] px-5 py-9 lg:px-8">

        {/* HERO */}

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>

            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#99714B]">
              SurgiTrack Control Centre
            </div>

            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">

              Hello, {user.name}.

            </h1>

            <p className="mt-2 text-sm text-[#8B8178]">

              {procedure
                ? `${procedure.caseId} · ${procedure.otRoom}`
                : "Ready for a new procedure"}

            </p>

          </div>

          {activeTab ===
            "overview" && (

            <motion.button
              whileHover={{
                y: -3,
              }}
              onClick={
                mainAction
              }
              className="button-sheen relative flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#A27A53] px-5 text-sm font-semibold text-white"
            >

              <span className="relative z-10 flex items-center gap-2">

                {procedure ? (
                  <>
                    Continue Procedure

                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />

                    Start New Procedure
                  </>
                )}

              </span>

            </motion.button>

          )}

        </div>

        {/* TABS */}

        <div className="mt-8 inline-flex rounded-2xl border border-[#DDD2C5] bg-[#FFFDF9]/80 p-1.5 backdrop-blur-xl">

          <TabButton
            active={
              activeTab ===
              "overview"
            }
            icon={
              Activity
            }
            label="Overview"
            onClick={() =>
              setActiveTab(
                "overview"
              )
            }
          />

          <TabButton
            active={
              activeTab ===
              "history"
            }
            icon={
              History
            }
            label={`My History (${history.length})`}
            onClick={() =>
              setActiveTab(
                "history"
              )
            }
          />

        </div>

        {/* ==================================================
            OVERVIEW
        ================================================== */}

        {activeTab ===
          "overview" && (

          <motion.div
            key="overview"
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >

            {/* METRICS */}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <StatCard
                icon={
                  Stethoscope
                }
                title="Active Procedure"
                value={
                  procedure
                    ? "01"
                    : "00"
                }
                caption={
                  procedure
                    ? procedure.caseId
                    : "No active case"
                }
              />

              <StatCard
                icon={
                  RadioTower
                }
                title="Current RFID"
                value={String(
                  scans.length
                ).padStart(
                  2,
                  "0"
                )}
                caption="Active procedure"
              />

              <StatCard
                icon={
                  Eye
                }
                title="Pre-Op Vision"
                value={
                  vision.preOpCaptured
                    ? "Ready"
                    : "—"
                }
                caption="Current procedure"
              />

              <StatCard
                icon={
                  History
                }
                title="Completed Procedures"
                value={String(
                  history.length
                ).padStart(
                  2,
                  "0"
                )}
                caption="Your history"
              />

            </div>

            {/* CURRENT PROCEDURE */}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">

              <section className="rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/86 p-7 shadow-[0_20px_55px_rgba(80,62,42,.06)] backdrop-blur-xl">

                <div className="flex items-center justify-between">

                  <div>

                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#98704A]">
                      Current Workflow
                    </div>

                    <h2 className="mt-2 text-xl font-semibold">
                      Active procedure
                    </h2>

                  </div>

                  {procedure && (

                    <span className="rounded-full border border-[#BDD0B8] bg-[#F2F8EF] px-3 py-1.5 text-[10px] font-semibold text-[#698067]">
                      ACTIVE
                    </span>

                  )}

                </div>

                {!procedure ? (

                  <div className="flex min-h-[300px] flex-col items-center justify-center text-center">

                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#F2E8DC]">

                      <Stethoscope className="h-7 w-7 text-[#A27A53]" />

                    </div>

                    <h3 className="mt-5 font-semibold">
                      No active procedure
                    </h3>

                    <p className="mt-2 max-w-md text-sm leading-6 text-[#968C82]">
                      Completed procedures remain safely stored in your history. Start a new case when ready.
                    </p>

                    <button
                      onClick={() =>
                        navigate(
                          "/new-procedure"
                        )
                      }
                      className="mt-6 flex h-11 items-center gap-2 rounded-xl bg-[#A27A53] px-5 text-sm font-semibold text-white"
                    >

                      <Plus className="h-4 w-4" />

                      Add Procedure

                    </button>

                  </div>

                ) : (

                  <div className="mt-7 grid gap-4 sm:grid-cols-2">

                    <InfoBox
                      title="Case ID"
                      value={
                        procedure.caseId
                      }
                    />

                    <InfoBox
                      title="Operating Theatre"
                      value={
                        procedure.otRoom
                      }
                    />

                    <InfoBox
                      title="Procedure"
                      value={
                        procedure.procedureName
                      }
                    />

                    <InfoBox
                      title="Lead Surgeon"
                      value={
                        procedure.surgeon
                      }
                    />

                  </div>

                )}

              </section>

              {/* PERSON SUMMARY */}

              <section className="rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/86 p-7 backdrop-blur-xl">

                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#98704A]">
                  My Activity
                </div>

                <h2 className="mt-2 text-xl font-semibold">
                  OT summary
                </h2>

                <div className="mt-6 space-y-3">

                  <ActivityRow
                    icon={
                      CheckCircle2
                    }
                    title="Procedures attended"
                    value={
                      historyStats.procedures
                    }
                  />

                  <ActivityRow
                    icon={
                      RadioTower
                    }
                    title="Instruments handled"
                    value={
                      historyStats.instruments
                    }
                  />

                  <ActivityRow
                    icon={
                      MapPin
                    }
                    title="OT rooms attended"
                    value={
                      historyStats.otRooms
                    }
                  />

                </div>

                <button
                  onClick={() =>
                    setActiveTab(
                      "history"
                    )
                  }
                  className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D8CDC0] bg-[#FAF6F0] text-sm font-medium text-[#75695F]"
                >

                  <History className="h-4 w-4" />

                  View My History

                </button>

              </section>

            </div>

          </motion.div>

        )}

        {/* ==================================================
            HISTORY
        ================================================== */}

        {activeTab ===
          "history" && (

          <motion.div
            key="history"
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >

            {/* HISTORY METRICS */}

            <div className="mt-6 grid gap-4 md:grid-cols-3">

              <HistoryMetric
                icon={
                  Stethoscope
                }
                label="Procedures Attended"
                value={
                  historyStats.procedures
                }
              />

              <HistoryMetric
                icon={
                  RadioTower
                }
                label="Instruments Used"
                value={
                  historyStats.instruments
                }
              />

              <HistoryMetric
                icon={
                  MapPin
                }
                label="OT Rooms Attended"
                value={
                  historyStats.otRooms
                }
              />

            </div>

            {/* HISTORY LIST */}

            <section className="mt-6 overflow-hidden rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/88 shadow-[0_20px_55px_rgba(80,62,42,.06)] backdrop-blur-xl">

              <div className="border-b border-[#E8E0D7] px-6 py-5">

                <h2 className="font-semibold">
                  Procedure history
                </h2>

                <p className="mt-1 text-xs text-[#958B81]">
                  Procedures attended by {user.name}
                </p>

              </div>

              {history.length ===
              0 ? (

                <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">

                  <History className="h-9 w-9 text-[#A27A53]" />

                  <h3 className="mt-5 font-semibold">
                    No completed procedures yet
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-[#978D83]">
                    Once a procedure is completed and archived, it will appear here.
                  </p>

                </div>

              ) : (

                <div className="space-y-4 p-5">

                  {history.map(
                    (
                      record,
                      index
                    ) => (

                      <HistoryCard
                        key={
                          record.historyId
                        }
                        record={
                          record
                        }
                        index={
                          index
                        }
                      />

                    )
                  )}

                </div>

              )}

            </section>

          </motion.div>

        )}

      </main>

    </div>
  );
}

/* ======================================================
   COMPONENTS
====================================================== */

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}) {
  return (
    <button
      onClick={
        onClick
      }
      className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${
        active
          ? "bg-[#A27A53] text-white shadow-md"
          : "text-[#84796F] hover:bg-[#F4ECE2]"
      }`}
    >

      <Icon className="h-4 w-4" />

      {label}

    </button>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  caption,
}) {
  return (
    <motion.div
      whileHover={{
        y: -4,
      }}
      className="rounded-[22px] border border-[#DED3C6] bg-[#FFFDF9]/86 p-5 backdrop-blur-xl"
    >

      <Icon className="h-5 w-5 text-[#A27A53]" />

      <div className="mt-5 text-2xl font-semibold">
        {value}
      </div>

      <div className="mt-2 text-sm font-medium">
        {title}
      </div>

      <div className="mt-1 text-xs text-[#978D83]">
        {caption}
      </div>

    </motion.div>
  );
}

function InfoBox({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-[#E2D9CF] bg-[#FAF7F2] p-5">

      <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9C9288]">
        {title}
      </div>

      <div className="mt-2 text-sm font-medium">
        {value || "—"}
      </div>

    </div>
  );
}

function ActivityRow({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#E3DAD0] bg-[#FAF7F2] px-4 py-4">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2E8DC]">

          <Icon className="h-4 w-4 text-[#A27A53]" />

        </div>

        <span className="text-sm text-[#746A61]">
          {title}
        </span>

      </div>

      <span className="text-lg font-semibold">
        {value}
      </span>

    </div>
  );
}

function HistoryMetric({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-[22px] border border-[#DED3C6] bg-[#FFFDF9]/86 p-6 backdrop-blur-xl">

      <Icon className="h-5 w-5 text-[#A27A53]" />

      <div className="mt-5 text-3xl font-semibold">
        {value}
      </div>

      <div className="mt-2 text-sm text-[#847A70]">
        {label}
      </div>

    </div>
  );
}

function HistoryCard({
  record,
  index,
}) {
  const completedDate =
    record.completedAt
      ? new Date(
          record.completedAt
        )
      : null;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay:
          index * 0.05,
      }}
      className="rounded-[22px] border border-[#DED4C8] bg-[#FBF8F4] p-5"
    >

      {/* TOP */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <div className="text-lg font-semibold">
              {record.procedureName}
            </div>

            <span className="rounded-full bg-[#E5EFE2] px-3 py-1 text-[9px] font-semibold text-[#698067]">
              COMPLETED
            </span>

          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#887E74]">

            <span>
              {record.caseId}
            </span>

            <span className="flex items-center gap-1.5">

              <MapPin className="h-3.5 w-3.5" />

              {record.otRoom}

            </span>

            {completedDate && (

              <span className="flex items-center gap-1.5">

                <CalendarDays className="h-3.5 w-3.5" />

                {completedDate.toLocaleDateString()}

              </span>

            )}

          </div>

        </div>

        <div className="rounded-xl bg-[#F0E5D8] px-4 py-2 text-center">

          <div className="text-lg font-semibold text-[#8E6844]">
            {record.instrumentCount}
          </div>

          <div className="text-[9px] uppercase tracking-wider text-[#9A8775]">
            Instruments
          </div>

        </div>

      </div>

      {/* DETAILS */}

      <div className="mt-5 grid gap-3 md:grid-cols-3">

        <HistoryInfo
          title="Lead Surgeon"
          value={
            record.surgeon
          }
        />

        <HistoryInfo
          title="Attended As"
          value={
            record
              .attendedBy
              ?.role ||
            "—"
          }
        />

        <HistoryInfo
          title="Completed"
          value={
            completedDate
              ? completedDate.toLocaleTimeString(
                  [],
                  {
                    hour:
                      "2-digit",
                    minute:
                      "2-digit",
                  }
                )
              : "—"
          }
        />

      </div>

      {/* INSTRUMENTS */}

      <div className="mt-5 border-t border-[#E6DDD3] pt-4">

        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#968B81]">
          Instruments / RFID Records
        </div>

        {record.rfidScans
          ?.length > 0 ? (

          <div className="flex flex-wrap gap-2">

            {record.rfidScans.map(
              (
                scan
              ) => {

                const label =
                  scan
                    ?.instrument
                    ?.name ||
                  scan.uid;

                return (
                  <span
                    key={
                      scan.uid
                    }
                    className="rounded-lg border border-[#DDD2C6] bg-[#FFFDF9] px-3 py-2 font-mono text-[10px] text-[#74695F]"
                  >
                    {label}
                  </span>
                );
              }
            )}

          </div>

        ) : (

          <div className="text-xs text-[#968C82]">
            No instrument records.
          </div>

        )}

      </div>

    </motion.div>
  );
}

function HistoryInfo({
  title,
  value,
}) {
  return (
    <div className="rounded-xl border border-[#E5DCD2] bg-[#FFFDF9] p-3">

      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A9085]">
        {title}
      </div>

      <div className="mt-1.5 text-xs font-medium">
        {value || "—"}
      </div>

    </div>
  );
}