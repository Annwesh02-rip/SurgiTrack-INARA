import {
  useEffect,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import {
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
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
  archiveCurrentProcedure,
  getCurrentProcedure,
  getCurrentUser,
  getRfidScans,
  getVisionStatus,
} from "../utils/demoStore";

export default function FinalReconciliation() {
  const navigate =
    useNavigate();

  const user =
    getCurrentUser();

  const [
    procedure,
    setProcedure,
  ] = useState(null);

  const [
    scans,
    setScans,
  ] = useState([]);

  const [
    vision,
    setVision,
  ] = useState({
    preOpCaptured: false,
    postOpCaptured: false,
  });

  const [
    completing,
    setCompleting,
  ] = useState(false);

  /* =====================================================
     LOAD CURRENT PROCEDURE DATA
  ===================================================== */

  useEffect(() => {
    setProcedure(
      getCurrentProcedure()
    );

    setScans(
      getRfidScans()
    );

    setVision(
      getVisionStatus()
    );
  }, []);

  const acquisitionComplete =
    scans.length > 0 &&
    vision.preOpCaptured ===
      true &&
    vision.postOpCaptured ===
      true;

  /* =====================================================
     COMPLETE AND ARCHIVE
  ===================================================== */

  const completeProcedure =
    () => {
      if (
        !acquisitionComplete ||
        completing
      ) {
        return;
      }

      setCompleting(true);

      const archived =
        archiveCurrentProcedure();

      if (!archived) {
        setCompleting(false);
        return;
      }

      /*
       * archiveCurrentProcedure():
       *
       * saves case to history
       * clears active procedure
       * clears current RFID
       * clears current vision state
       */

      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );
    };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F0E8] text-[#2D2A26]">

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0">

        <div
          className="absolute inset-0 bg-[url('/doctors-bg.jpg')] bg-cover bg-center"
          style={{
            opacity: 0.17,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/98 via-[#F5F0E8]/90 to-[#F5F0E8]/58" />

      </div>

      {/* HEADER */}

      <header className="relative z-40 border-b border-[#DED5CA] bg-[#FAF7F2]/84 backdrop-blur-2xl">

        <div className="mx-auto flex h-[78px] max-w-[1600px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-4">

            <button
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

                <ShieldCheck className="h-5 w-5 text-[#9A724A]" />

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
                {user.name}
              </div>

              <div className="text-[11px] text-[#968C82]">
                {user.employeeId} · {user.role}
              </div>

            </div>

            <UserRound className="h-5 w-5 text-[#9A724A]" />

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-9 lg:px-8">

        {/* TITLE */}

        <div>

          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A724A]">

            <ShieldCheck className="h-4 w-4" />

            Surgical Instrument Verification

          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.035em] lg:text-4xl">

            Final reconciliation

          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#877D73]">

            Review the registered RFID inventory and both visual acquisition stages before archiving this procedure.

          </p>

        </div>

        {/* CASE */}

        <div className="mt-7 flex flex-col justify-between gap-4 rounded-[22px] border border-[#DED3C6] bg-[#FFFDF9]/88 px-6 py-5 md:flex-row md:items-center">

          <div>

            <div className="text-sm font-semibold">

              {procedure?.caseId ||
                "No active procedure"}

            </div>

            <div className="mt-1 text-xs text-[#968B80]">

              {procedure?.otRoom ||
                "—"}

              {procedure?.procedureName
                ? ` · ${procedure.procedureName}`
                : ""}

            </div>

          </div>

          <div
            className={`rounded-full border px-4 py-2 text-[10px] font-semibold ${
              acquisitionComplete
                ? "border-[#BCD0B7] bg-[#F2F8EF] text-[#698067]"
                : "border-[#DFCFAE] bg-[#FBF5E8] text-[#94724D]"
            }`}
          >

            {acquisitionComplete
              ? "READY TO ARCHIVE"
              : "RECONCILIATION PENDING"}

          </div>

        </div>

        {/* SOURCES */}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">

          <SourceCard
            icon={
              RadioTower
            }
            title="RFID Inventory"
            value={`${scans.length} registered tags`}
            ready={
              scans.length > 0
            }
          />

          <SourceCard
            icon={
              Eye
            }
            title="Pre-Op Vision"
            value={
              vision.preOpCaptured
                ? "Captured"
                : "Missing"
            }
            ready={
              vision.preOpCaptured
            }
          />

          <SourceCard
            icon={
              ScanLine
            }
            title="Post-Op Vision"
            value={
              vision.postOpCaptured
                ? "Captured"
                : "Missing"
            }
            ready={
              vision.postOpCaptured
            }
          />

        </div>

        {/* CONTENT */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">

          {/* INVENTORY */}

          <section className="overflow-hidden rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/90 shadow-[0_20px_55px_rgba(80,62,42,.06)]">

            <div className="flex items-center justify-between border-b border-[#E8E0D7] px-6 py-5">

              <div>

                <h2 className="font-semibold">
                  Procedure inventory
                </h2>

                <p className="mt-1 text-xs text-[#958B81]">
                  RFID records for this procedure
                </p>

              </div>

              <Database className="h-5 w-5 text-[#A27A53]" />

            </div>

            {scans.length ===
            0 ? (

              <div className="p-10 text-center text-sm text-[#968C82]">
                No RFID records available.
              </div>

            ) : (

              <div className="divide-y divide-[#ECE4DB]">

                {scans.map(
                  (scan) => (

                    <div
                      key={
                        scan.uid
                      }
                      className="grid gap-4 px-6 py-5 md:grid-cols-[1.3fr_1fr_1fr]"
                    >

                      <div>

                        <div className="text-[9px] uppercase tracking-wider text-[#9B9187]">
                          RFID UID
                        </div>

                        <div className="mt-1 font-mono text-xs font-semibold">
                          {scan.uid}
                        </div>

                      </div>

                      <ResultCell
                        label="Instrument"
                        value={
                          scan
                            ?.instrument
                            ?.name ||
                          "DB lookup pending"
                        }
                      />

                      <ResultCell
                        label="Vision"
                        value="CNN integration pending"
                      />

                    </div>

                  )
                )}

              </div>

            )}

          </section>

          {/* RIGHT */}

          <div className="space-y-6">

            {/* STATUS */}

            <section
              className={`rounded-[28px] border p-6 ${
                acquisitionComplete
                  ? "border-[#BED0B8] bg-[#F3F8F0]/94"
                  : "border-[#E0C6BE] bg-[#FAF0ED]/94"
              }`}
            >

              <div className="flex items-start gap-4">

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    acquisitionComplete
                      ? "bg-[#DFECDA]"
                      : "bg-[#F1DDD8]"
                  }`}
                >

                  {acquisitionComplete ? (

                    <CheckCircle2 className="h-5 w-5 text-[#6F896E]" />

                  ) : (

                    <ShieldAlert className="h-5 w-5 text-[#AD665B]" />

                  )}

                </div>

                <div>

                  <div className="text-sm font-semibold">

                    {acquisitionComplete
                      ? "Procedure data complete"
                      : "Procedure data incomplete"}

                  </div>

                  <p className="mt-2 text-xs leading-5 text-[#81776D]">

                    {acquisitionComplete
                      ? "RFID, pre-op and post-op acquisition are all complete."
                      : "Complete RFID registration, pre-op scan and post-op scan first."}

                  </p>

                </div>

              </div>

            </section>

            {/* INDIVIDUAL CHECKS */}

            <section className="rounded-[28px] border border-[#DDD2C5] bg-[#FFFDF9]/90 p-6">

              <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#96704B]">
                Acquisition Checklist
              </div>

              <div className="mt-5 space-y-3">

                <CheckRow
                  label="RFID Registration"
                  ready={
                    scans.length >
                    0
                  }
                />

                <CheckRow
                  label="Pre-Op Vision"
                  ready={
                    vision.preOpCaptured
                  }
                />

                <CheckRow
                  label="Post-Op Vision"
                  ready={
                    vision.postOpCaptured
                  }
                />

              </div>

            </section>

            {/* COMPLETE */}

            <motion.button
              whileHover={
                acquisitionComplete
                  ? {
                      y: -3,
                      scale: 1.01,
                    }
                  : {}
              }
              whileTap={
                acquisitionComplete
                  ? {
                      scale: 0.985,
                    }
                  : {}
              }
              disabled={
                !acquisitionComplete ||
                completing
              }
              onClick={
                completeProcedure
              }
              className={`flex h-14 w-full items-center justify-center rounded-2xl text-sm font-semibold ${
                acquisitionComplete
                  ? "bg-[#A27A53] text-white shadow-lg"
                  : "cursor-not-allowed bg-[#E5DDD4] text-[#AAA096]"
              }`}
            >

              {completing ? (

                <span className="flex items-center gap-3">

                  <LoaderCircle className="h-4 w-4 animate-spin" />

                  Archiving Procedure...

                </span>

              ) : (

                <span className="flex items-center gap-3">

                  <ShieldCheck className="h-4 w-4" />

                  Complete & Archive Procedure

                </span>

              )}

            </motion.button>

            <button
              onClick={() =>
                navigate(
                  "/post-op-scan"
                )
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D7CCBF] bg-[#FFFDF9]"
            >

              <ArrowLeft className="h-4 w-4" />

              Back to Post-Op Scan

            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function SourceCard({
  icon: Icon,
  title,
  value,
  ready,
}) {
  return (
    <motion.div
      whileHover={{
        y: -4,
      }}
      className="rounded-[22px] border border-[#DED3C6] bg-[#FFFDF9]/88 p-5"
    >

      <div className="flex items-center justify-between">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            ready
              ? "bg-[#E5EFE2]"
              : "bg-[#F2E8DC]"
          }`}
        >

          <Icon
            className={`h-5 w-5 ${
              ready
                ? "text-[#6F896E]"
                : "text-[#A27A53]"
            }`}
          />

        </div>

        <span
          className={`rounded-full px-3 py-1 text-[9px] font-semibold ${
            ready
              ? "bg-[#E7F0E4] text-[#6C856B]"
              : "bg-[#F4EBDD] text-[#9A754F]"
          }`}
        >

          {ready
            ? "READY"
            : "PENDING"}

        </span>

      </div>

      <div className="mt-5 text-sm font-semibold">
        {title}
      </div>

      <div className="mt-2 text-xs text-[#877D73]">
        {value}
      </div>

    </motion.div>
  );
}

function ResultCell({
  label,
  value,
}) {
  return (
    <div>

      <div className="text-[9px] uppercase tracking-wider text-[#9B9187]">
        {label}
      </div>

      <div className="mt-1 text-xs text-[#746A61]">
        {value}
      </div>

    </div>
  );
}

function CheckRow({
  label,
  ready,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#E3DAD0] bg-[#FAF7F2] px-4 py-3">

      <span className="text-sm">
        {label}
      </span>

      <span
        className={`flex items-center gap-2 text-xs font-semibold ${
          ready
            ? "text-[#668064]"
            : "text-[#A27A53]"
        }`}
      >

        {ready ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            READY
          </>
        ) : (
          <>
            <Clock3 className="h-4 w-4" />
            PENDING
          </>
        )}

      </span>

    </div>
  );
}