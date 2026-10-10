import {
  useCallback,
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
  History,
  LoaderCircle,
  LogOut,
  MapPin,
  Plus,
  RadioTower,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";

import {
  getProcedureHistory,
  getProcedures,
} from "../services/api";

import {
  clearCurrentUser,
  getCurrentProcedureId,
  getCurrentUser,
  saveCurrentProcedureId,
} from "../utils/demoStore";


/* =========================================================
   STATUS HELPERS
========================================================= */

function normalizeStatus(
  status
) {
  return String(
    status || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}


function isCompletedStatus(
  status
) {
  const value =
    normalizeStatus(
      status
    );

  return [
    "completed",
    "complete",
    "archived",
    "cancelled",
    "canceled",
  ].includes(
    value
  );
}


function formatStatus(
  status
) {
  const value =
    normalizeStatus(
      status
    );

  const labels = {
    created:
      "Created",

    pending:
      "Pending",

    rfid_registration:
      "RFID Registration",

    pre_op:
      "Pre-Op",

    active:
      "Procedure Active",

    in_progress:
      "Procedure Active",

    post_op:
      "Post-Op",

    reconciliation:
      "Reconciliation",

    completed:
      "Completed",

    complete:
      "Completed",

    archived:
      "Archived",

    cancelled:
      "Cancelled",

    canceled:
      "Cancelled",
  };

  return (
    labels[value] ||
    String(
      status || "Unknown"
    )
  );
}


/* =========================================================
   RESUME ROUTE
========================================================= */

function getResumeRoute(
  status
) {
  const value =
    normalizeStatus(
      status
    );

  if (
    value ===
      "pre_op" ||
    value ===
      "preop"
  ) {
    return "/pre-op-scan";
  }

  if (
    value ===
      "active" ||
    value ===
      "in_progress"
  ) {
    return "/procedure-active";
  }

  if (
    value ===
      "post_op" ||
    value ===
      "postop"
  ) {
    return "/post-op-scan";
  }

  if (
    value ===
    "reconciliation"
  ) {
    return "/final-reconciliation";
  }

  return "/rfid-registration";
}


/* =========================================================
   DATE HELPERS
========================================================= */

function formatDate(
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

  return date.toLocaleDateString();
}


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
    }
  );
}


/* =========================================================
   NORMALIZE API ARRAY
========================================================= */

function normalizeArray(
  result
) {
  if (
    Array.isArray(
      result
    )
  ) {
    return result;
  }

  if (
    Array.isArray(
      result?.items
    )
  ) {
    return result.items;
  }

  if (
    Array.isArray(
      result?.procedures
    )
  ) {
    return result.procedures;
  }

  return [];
}


/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const navigate =
    useNavigate();

  const user =
    getCurrentUser();

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "overview"
  );

  const [
    procedures,
    setProcedures,
  ] = useState([]);

  const [
    history,
    setHistory,
  ] = useState([]);

  const [
    activeProcedure,
    setActiveProcedure,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  /* =========================================================
     LOAD REAL BACKEND DATA
  ========================================================= */

  const loadDashboard =
    useCallback(
      async (
        manualRefresh = false
      ) => {
        if (
          manualRefresh
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError("");

        try {
          const [
            proceduresResult,
            historyResult,
          ] =
            await Promise.all([
              getProcedures(),
              getProcedureHistory(),
            ]);

          const procedureList =
            normalizeArray(
              proceduresResult
            );

          const historyList =
            normalizeArray(
              historyResult
            );


          setProcedures(
            procedureList
          );


          /*
           * Some backends return all
           * history records, while
           * others may return only
           * completed procedures.
           *
           * Keep completed records.
           */

          const completed =
            historyList.length >
            0
              ? historyList
              : procedureList.filter(
                  (
                    procedure
                  ) =>
                    isCompletedStatus(
                      procedure.status
                    )
                );

          setHistory(
            completed
          );


          /* ===============================================
             RESTORE CURRENT PROCEDURE
          =============================================== */

          const storedId =
            getCurrentProcedureId();

          let current =
            null;


          /*
           * First preference:
           * procedure ID already
           * selected on this browser.
           */

          if (
            storedId
          ) {
            current =
              procedureList.find(
                (
                  procedure
                ) =>
                  Number(
                    procedure.id
                  ) ===
                    Number(
                      storedId
                    ) &&
                  !isCompletedStatus(
                    procedure.status
                  )
              ) ||
              null;
          }


          /*
           * Browser may have been
           * refreshed or storage was
           * cleared.
           *
           * Fall back to latest active
           * backend procedure.
           */

          if (
            !current
          ) {
            const active =
              procedureList
                .filter(
                  (
                    procedure
                  ) =>
                    !isCompletedStatus(
                      procedure.status
                    )
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    new Date(
                      b.updated_at ||
                      b.created_at ||
                      0
                    ) -
                    new Date(
                      a.updated_at ||
                      a.created_at ||
                      0
                    )
                );

            current =
              active[0] ||
              null;
          }


          if (
            current?.id
          ) {
            saveCurrentProcedureId(
              current.id
            );
          }

          setActiveProcedure(
            current
          );
        } catch (
          loadError
        ) {
          console.error(
            "Dashboard load failed:",
            loadError
          );

          setError(
            loadError?.message ||
            "Unable to load SurgiTrack dashboard."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );


  useEffect(() => {
    loadDashboard();
  }, [
    loadDashboard,
  ]);


  /* =========================================================
     DASHBOARD STATS
  ========================================================= */

  const stats =
    useMemo(
      () => {
        const allRooms =
          new Set(
            history
              .map(
                (
                  item
                ) =>
                  item.ot_room
              )
              .filter(
                Boolean
              )
          );

        const safeCount =
          history.filter(
            (
              item
            ) =>
              normalizeStatus(
                item.status
              ) ===
                "completed" ||
              normalizeStatus(
                item.status
              ) ===
                "complete"
          ).length;

        return {
          completed:
            history.length,

          rooms:
            allRooms.size,

          safeCount,

          allProcedures:
            procedures.length,
        };
      },
      [
        history,
        procedures,
      ]
    );


  /* =========================================================
     LOGOUT
  ========================================================= */

  const logout =
    () => {
      clearCurrentUser();

      navigate(
        "/",
        {
          replace: true,
        }
      );
    };


  /* =========================================================
     START / CONTINUE
  ========================================================= */

  const mainAction =
    () => {
      if (
        activeProcedure
      ) {
        saveCurrentProcedureId(
          activeProcedure.id
        );

        navigate(
          getResumeRoute(
            activeProcedure.status
          )
        );

        return;
      }

      navigate(
        "/new-procedure"
      );
    };


  /* =========================================================
     SELECT PROCEDURE
  ========================================================= */

  const resumeProcedure =
    (
      procedure
    ) => {
      if (
        !procedure?.id
      ) {
        return;
      }

      saveCurrentProcedureId(
        procedure.id
      );

      navigate(
        getResumeRoute(
          procedure.status
        )
      );
    };


  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">

        <div className="flex items-center gap-3 text-sm text-[#887D72]">

          <LoaderCircle className="h-5 w-5 animate-spin" />

          Loading SurgiTrack...

        </div>

      </div>
    );
  }


  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F0E8] text-[#2D2A26]">


      {/* =====================================================
          BACKGROUND
      ===================================================== */}

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


      {/* =====================================================
          HEADER
      ===================================================== */}

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

          <div className="flex items-center gap-3">

            <button
              type="button"
              title="Refresh dashboard"
              onClick={() =>
                loadDashboard(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DED4C8] bg-[#FFFDF9] text-[#968C82]"
            >

              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

            </button>


            <div className="hidden text-right sm:block">

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


            <button
              type="button"
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


      {/* =====================================================
          MAIN
      ===================================================== */}

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

              {activeProcedure
                ? `${
                    activeProcedure.case_id
                  } · ${
                    activeProcedure.ot_room ||
                    "OT"
                  } · ${formatStatus(
                    activeProcedure.status
                  )}`
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

                {activeProcedure ? (
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


        {/* ERROR */}

        {error && (

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#E3C6BF] bg-[#FBF0ED] px-4 py-3 text-xs leading-5 text-[#A15E54]">

            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />

            {error}

          </div>

        )}


        {/* ===================================================
            TABS
        =================================================== */}

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
            label={`History (${history.length})`}
            onClick={() =>
              setActiveTab(
                "history"
              )
            }
          />

        </div>


        {/* ===================================================
            OVERVIEW
        =================================================== */}

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
                  activeProcedure
                    ? "01"
                    : "00"
                }
                caption={
                  activeProcedure
                    ? activeProcedure
                        .case_id
                    : "No active case"
                }
              />

              <StatCard
                icon={
                  History
                }
                title="Completed Procedures"
                value={
                  String(
                    stats.completed
                  ).padStart(
                    2,
                    "0"
                  )
                }
                caption="Backend history"
              />

              <StatCard
                icon={
                  MapPin
                }
                title="OT Rooms"
                value={
                  String(
                    stats.rooms
                  ).padStart(
                    2,
                    "0"
                  )
                }
                caption="Historical activity"
              />

              <StatCard
                icon={
                  ShieldCheck
                }
                title="Database Records"
                value={
                  String(
                    stats.allProcedures
                  ).padStart(
                    2,
                    "0"
                  )
                }
                caption="Total procedures"
              />

            </div>


            {/* ACTIVE PROCEDURE */}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">


              <section className="rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/86 p-7 shadow-[0_20px_55px_rgba(80,62,42,.06)] backdrop-blur-xl">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#98704A]">
                      Current Workflow
                    </div>

                    <h2 className="mt-2 text-xl font-semibold">
                      Active procedure
                    </h2>

                  </div>


                  {activeProcedure && (

                    <span className="rounded-full border border-[#BDD0B8] bg-[#F2F8EF] px-3 py-1.5 text-[10px] font-semibold text-[#698067]">

                      {formatStatus(
                        activeProcedure.status
                      ).toUpperCase()}

                    </span>

                  )}

                </div>


                {!activeProcedure ? (

                  <div className="flex min-h-[300px] flex-col items-center justify-center text-center">

                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#F2E8DC]">

                      <Stethoscope className="h-7 w-7 text-[#A27A53]" />

                    </div>

                    <h3 className="mt-5 font-semibold">
                      No active procedure
                    </h3>

                    <p className="mt-2 max-w-md text-sm leading-6 text-[#968C82]">
                      Completed procedures remain in the backend history. Start a new case when ready.
                    </p>

                    <button
                      type="button"
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

                  <>

                    <div className="mt-7 grid gap-4 sm:grid-cols-2">

                      <InfoBox
                        title="Case ID"
                        value={
                          activeProcedure
                            .case_id
                        }
                      />

                      <InfoBox
                        title="Operating Theatre"
                        value={
                          activeProcedure
                            .ot_room
                        }
                      />

                      <InfoBox
                        title="Procedure"
                        value={
                          activeProcedure
                            .procedure_name
                        }
                      />

                      <InfoBox
                        title="Lead Surgeon"
                        value={
                          activeProcedure
                            .surgeon_name
                        }
                      />

                    </div>


                    <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#DFD6CB] bg-[#FAF7F2] p-4 sm:flex-row sm:items-center">

                      <div>

                        <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#998E83]">
                          Current Stage
                        </div>

                        <div className="mt-1 text-sm font-semibold">
                          {formatStatus(
                            activeProcedure
                              .status
                          )}
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          resumeProcedure(
                            activeProcedure
                          )
                        }
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#A27A53] px-5 text-xs font-semibold text-white"
                      >

                        Resume

                        <ChevronRight className="h-4 w-4" />

                      </button>

                    </div>

                  </>

                )}

              </section>


              {/* USER SUMMARY */}

              <section className="rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/86 p-7 backdrop-blur-xl">

                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#98704A]">
                  Current User
                </div>

                <h2 className="mt-2 text-xl font-semibold">
                  OT access
                </h2>


                <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[#E3DAD0] bg-[#FAF7F2] p-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0E5D8]">

                    <UserRound className="h-5 w-5 text-[#A27A53]" />

                  </div>

                  <div>

                    <div className="text-sm font-semibold">
                      {user.name}
                    </div>

                    <div className="mt-1 text-xs text-[#887D73]">
                      {user.role}
                    </div>

                    <div className="mt-1 font-mono text-[10px] text-[#A0958A]">
                      {user.employeeId}
                    </div>

                  </div>

                </div>


                <div className="mt-5 space-y-3">

                  <ActivityRow
                    icon={
                      CheckCircle2
                    }
                    title="Completed procedures"
                    value={
                      stats.completed
                    }
                  />

                  <ActivityRow
                    icon={
                      MapPin
                    }
                    title="OT rooms recorded"
                    value={
                      stats.rooms
                    }
                  />

                  <ActivityRow
                    icon={
                      RadioTower
                    }
                    title="System"
                    value="Online"
                  />

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "history"
                    )
                  }
                  className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D8CDC0] bg-[#FAF6F0] text-sm font-medium text-[#75695F]"
                >

                  <History className="h-4 w-4" />

                  View Procedure History

                </button>

              </section>

            </div>


            {/* OTHER ACTIVE PROCEDURES */}

            {procedures.filter(
              (
                item
              ) =>
                !isCompletedStatus(
                  item.status
                ) &&
                Number(
                  item.id
                ) !==
                  Number(
                    activeProcedure?.id
                  )
            ).length >
              0 && (

              <section className="mt-6 overflow-hidden rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/88">

                <div className="border-b border-[#E8E0D7] px-6 py-5">

                  <h2 className="font-semibold">
                    Other open procedures
                  </h2>

                  <p className="mt-1 text-xs text-[#958B81]">
                    Open cases currently stored in the backend.
                  </p>

                </div>


                <div className="divide-y divide-[#ECE4DB]">

                  {procedures
                    .filter(
                      (
                        item
                      ) =>
                        !isCompletedStatus(
                          item.status
                        ) &&
                        Number(
                          item.id
                        ) !==
                          Number(
                            activeProcedure?.id
                          )
                    )
                    .map(
                      (
                        item
                      ) => (

                        <button
                          key={
                            item.id
                          }
                          type="button"
                          onClick={() =>
                            resumeProcedure(
                              item
                            )
                          }
                          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-[#FBF8F4]"
                        >

                          <div>

                            <div className="text-sm font-semibold">
                              {item.procedure_name}
                            </div>

                            <div className="mt-1 text-xs text-[#92877D]">

                              {item.case_id}

                              {" · "}

                              {item.ot_room ||
                                "OT"}

                            </div>

                          </div>


                          <div className="flex items-center gap-3">

                            <span className="rounded-full bg-[#F2E8DC] px-3 py-1.5 text-[9px] font-semibold text-[#92704F]">
                              {formatStatus(
                                item.status
                              )}
                            </span>

                            <ChevronRight className="h-4 w-4 text-[#A0958A]" />

                          </div>

                        </button>

                      )
                    )}

                </div>

              </section>

            )}

          </motion.div>

        )}


        {/* ===================================================
            HISTORY
        =================================================== */}

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
                label="Completed Procedures"
                value={
                  stats.completed
                }
              />

              <HistoryMetric
                icon={
                  MapPin
                }
                label="OT Rooms"
                value={
                  stats.rooms
                }
              />

              <HistoryMetric
                icon={
                  DatabaseIcon
                }
                label="Database Procedures"
                value={
                  stats.allProcedures
                }
              />

            </div>


            {/* HISTORY LIST */}

            <section className="mt-6 overflow-hidden rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/88 shadow-[0_20px_55px_rgba(80,62,42,.06)] backdrop-blur-xl">

              <div className="flex items-center justify-between border-b border-[#E8E0D7] px-6 py-5">

                <div>

                  <h2 className="font-semibold">
                    Procedure history
                  </h2>

                  <p className="mt-1 text-xs text-[#958B81]">
                    Records loaded from the SurgiTrack backend
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    loadDashboard(
                      true
                    )
                  }
                  disabled={
                    refreshing
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD2C6]"
                >

                  <RefreshCw
                    className={`h-4 w-4 ${
                      refreshing
                        ? "animate-spin"
                        : ""
                    }`}
                  />

                </button>

              </div>


              {history.length ===
              0 ? (

                <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">

                  <History className="h-9 w-9 text-[#A27A53]" />

                  <h3 className="mt-5 font-semibold">
                    No completed procedures yet
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-[#978D83]">
                    Procedures completed through SurgiTrack will appear here.
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
                          record.id ||
                          `${record.case_id}-${index}`
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


/* =========================================================
   TAB BUTTON
========================================================= */

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
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


/* =========================================================
   STAT CARD
========================================================= */

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


/* =========================================================
   INFO BOX
========================================================= */

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


/* =========================================================
   ACTIVITY ROW
========================================================= */

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

      <span className="text-sm font-semibold">
        {value}
      </span>

    </div>
  );
}


/* =========================================================
   HISTORY METRIC
========================================================= */

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


/* =========================================================
   DATABASE ICON WRAPPER
========================================================= */

function DatabaseIcon(
  props
) {
  return (
    <ShieldCheck
      {...props}
    />
  );
}


/* =========================================================
   HISTORY CARD
========================================================= */

function HistoryCard({
  record,
  index,
}) {
  const date =
    record.updated_at ||
    record.created_at;

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
          index *
          0.04,
      }}
      className="rounded-[22px] border border-[#DED4C8] bg-[#FBF8F4] p-5"
    >

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <div className="text-lg font-semibold">
              {record.procedure_name ||
                "Procedure"}
            </div>

            <HistoryStatusBadge
              status={
                record.status
              }
            />

          </div>


          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#887E74]">

            <span>
              {record.case_id ||
                "—"}
            </span>

            <span className="flex items-center gap-1.5">

              <MapPin className="h-3.5 w-3.5" />

              {record.ot_room ||
                "—"}

            </span>

            <span className="flex items-center gap-1.5">

              <CalendarDays className="h-3.5 w-3.5" />

              {formatDate(
                date
              )}

            </span>

            <span className="flex items-center gap-1.5">

              <Clock3 className="h-3.5 w-3.5" />

              {formatTime(
                date
              )}

            </span>

          </div>

        </div>


        <div className="rounded-xl bg-[#F0E5D8] px-4 py-2 text-center">

          <div className="text-[9px] uppercase tracking-wider text-[#9A8775]">
            Procedure ID
          </div>

          <div className="mt-1 text-lg font-semibold text-[#8E6844]">
            #{record.id}
          </div>

        </div>

      </div>


      <div className="mt-5 grid gap-3 md:grid-cols-3">

        <HistoryInfo
          title="Lead Surgeon"
          value={
            record.surgeon_name
          }
        />

        <HistoryInfo
          title="Operating Theatre"
          value={
            record.ot_room
          }
        />

        <HistoryInfo
          title="Final Status"
          value={
            formatStatus(
              record.status
            )
          }
        />

      </div>

    </motion.div>
  );
}


/* =========================================================
   HISTORY STATUS
========================================================= */

function HistoryStatusBadge({
  status,
}) {
  const normalized =
    normalizeStatus(
      status
    );

  const cancelled =
    normalized ===
      "cancelled" ||
    normalized ===
      "canceled";

  return (
    <span
      className={`rounded-full px-3 py-1 text-[9px] font-semibold ${
        cancelled
          ? "bg-[#FAEAE6] text-[#A46158]"
          : "bg-[#E5EFE2] text-[#698067]"
      }`}
    >

      {formatStatus(
        status
      ).toUpperCase()}

    </span>
  );
}


/* =========================================================
   HISTORY INFO
========================================================= */

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