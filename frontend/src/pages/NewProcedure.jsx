import {
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
  ArrowRight,
  ClipboardPlus,
  DoorOpen,
  Hash,
  LoaderCircle,
  ScanLine,
  Stethoscope,
  UserRound,
} from "lucide-react";

import {
  createProcedure,
  updateProcedureStatus,
} from "../services/api";

import {
  clearActiveProcedureState,
  getCurrentUser,
  saveCurrentProcedure,
  saveCurrentProcedureId,
} from "../utils/demoStore";


export default function NewProcedure() {
  const navigate =
    useNavigate();

  const user =
    getCurrentUser();

  const [
    form,
    setForm,
  ] = useState({
    caseId: "",
    procedureName: "",
    otRoom: "OT 01",
    surgeon: "",
  });

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);


  /* =========================================================
     UPDATE FORM
  ========================================================= */

  const update = (
    field,
    value
  ) => {
    setForm(
      (
        current
      ) => ({
        ...current,
        [field]:
          value,
      })
    );

    if (error) {
      setError("");
    }
  };


  /* =========================================================
     CREATE PROCEDURE IN FASTAPI
  ========================================================= */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      const caseId =
        form.caseId
          .trim()
          .toUpperCase();

      const procedureName =
        form.procedureName
          .trim();

      const surgeon =
        form.surgeon
          .trim();

      const otRoom =
        form.otRoom
          .trim();

      if (!caseId) {
        setError(
          "Enter the Case ID."
        );

        return;
      }

      if (!procedureName) {
        setError(
          "Enter the procedure name."
        );

        return;
      }

      if (!surgeon) {
        setError(
          "Enter the lead surgeon."
        );

        return;
      }

      if (!otRoom) {
        setError(
          "Select the operating theatre."
        );

        return;
      }

      setLoading(true);
      setError("");

      try {
        /*
         * Creates the real SQLite
         * procedure through FastAPI.
         */

        const created =
          await createProcedure({
            caseId,
            procedureName,
            surgeon,
            otRoom,
          });

        if (
          !created ||
          created.id ===
            undefined ||
          created.id === null
        ) {
          throw new Error(
            "Backend did not return a procedure ID."
          );
        }

        /*
         * Clear any old temporary
         * frontend workflow state.
         *
         * This does NOT delete the
         * backend procedure.
         */

        clearActiveProcedureState();

        /*
         * Keep only the backend ID as
         * the long-term frontend
         * workflow reference.
         */

        saveCurrentProcedureId(
          created.id
        );

        /*
         * Temporary compatibility
         * record.
         *
         * Existing pages are being
         * converted one-by-one.
         */

        saveCurrentProcedure({
          id:
            created.id,

          caseId:
            created.case_id ||
            caseId,

          procedureName:
            created.procedure_name ||
            procedureName,

          otRoom:
            created.ot_room ||
            otRoom,

          surgeon:
            created.surgeon_name ||
            surgeon,

          createdAt:
            created.created_at ||
            new Date()
              .toISOString(),

          status:
            "rfid_registration",
        });

        /*
         * Tell backend that the user
         * is moving to RFID setup.
         */

        try {
          await updateProcedureStatus(
            created.id,
            "rfid_registration"
          );
        } catch (
          statusError
        ) {
          /*
           * Procedure itself has
           * already been created.
           *
           * Do not make the user
           * accidentally create a
           * duplicate case just
           * because status update
           * failed.
           */

          console.warn(
            "Procedure created, but status update failed:",
            statusError
          );
        }

        navigate(
          "/rfid-registration"
        );
      } catch (
        createError
      ) {
        console.error(
          "Procedure creation failed:",
          createError
        );

        setError(
          createError?.message ||
          "Unable to create the procedure."
        );
      } finally {
        setLoading(false);
      }
    };


  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F0E8] text-[#2D2A26]">

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0">

        <div
          className="absolute inset-0 bg-[url('/doctors-bg.jpg')] bg-cover bg-center"
          style={{
            opacity: 0.18,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/98 via-[#F5F0E8]/90 to-[#F5F0E8]/60" />

      </div>


      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="relative z-30 border-b border-[#DED5CA] bg-[#FAF7F2]/82 backdrop-blur-2xl">

        <div className="mx-auto flex h-[78px] max-w-[1500px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-4">

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD2C5] bg-[#FFFDF9] transition hover:bg-[#F4ECE2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4C5B3] bg-[#FFFDF9]">

                <ScanLine className="h-5 w-5 text-[#9A724A]" />

              </div>

              <div>

                <div className="text-sm font-semibold tracking-[0.14em]">
                  SURGITRACK
                </div>

                <div className="text-[10px] text-[#9D9287]">
                  NEW PROCEDURE
                </div>

              </div>

            </div>

          </div>


          {/* CURRENT USER */}

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

        </div>

      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="relative z-10 mx-auto max-w-[1100px] px-6 py-12">

        <div className="mb-9">

          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A724A]">

            <ClipboardPlus className="h-4 w-4" />

            Procedure Setup

          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.035em]">
            Start a new procedure
          </h1>

          <p className="mt-3 text-sm text-[#877D73]">
            Create a new surgical procedure and continue to RFID instrument registration.
          </p>

        </div>


        {/* ===================================================
            FORM
        =================================================== */}

        <motion.form
          onSubmit={
            handleSubmit
          }
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="rounded-[28px] border border-[#DDD2C5] bg-[#FFFDF9]/90 p-8 shadow-[0_20px_55px_rgba(80,62,42,.07)] backdrop-blur-xl"
        >

          <div className="grid gap-6 md:grid-cols-2">


            {/* CASE ID */}

            <InputField
              label="Case ID"
              icon={Hash}
              placeholder="Enter case ID"
              value={
                form.caseId
              }
              disabled={
                loading
              }
              onChange={(
                event
              ) =>
                update(
                  "caseId",
                  event.target.value
                )
              }
            />


            {/* OT */}

            <SelectField
              label="Operating Theatre"
              icon={
                DoorOpen
              }
              value={
                form.otRoom
              }
              disabled={
                loading
              }
              onChange={(
                event
              ) =>
                update(
                  "otRoom",
                  event.target.value
                )
              }
            >

              <option value="OT 01">
                OT 01
              </option>

              <option value="OT 02">
                OT 02
              </option>

              <option value="OT 03">
                OT 03
              </option>

              <option value="OT 04">
                OT 04
              </option>

              <option value="OT 05">
                OT 05
              </option>

            </SelectField>


            {/* PROCEDURE */}

            <div className="md:col-span-2">

              <InputField
                label="Procedure"
                icon={
                  Stethoscope
                }
                placeholder="Enter procedure"
                value={
                  form.procedureName
                }
                disabled={
                  loading
                }
                onChange={(
                  event
                ) =>
                  update(
                    "procedureName",
                    event.target.value
                  )
                }
              />

            </div>


            {/* SURGEON */}

            <div className="md:col-span-2">

              <InputField
                label="Lead Surgeon"
                icon={
                  UserRound
                }
                placeholder="Enter surgeon name"
                value={
                  form.surgeon
                }
                disabled={
                  loading
                }
                onChange={(
                  event
                ) =>
                  update(
                    "surgeon",
                    event.target.value
                  )
                }
              />

            </div>

          </div>


          {/* ERROR */}

          {error && (

            <motion.div
              initial={{
                opacity: 0,
                y: -4,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="mt-6 rounded-xl border border-[#E3C6BF] bg-[#FBF0ED] px-4 py-3 text-xs leading-5 text-[#A15E54]"
            >
              {error}
            </motion.div>

          )}


          {/* PERSONNEL */}

          <div className="mt-7 rounded-2xl border border-[#DDD2C5] bg-[#F8F3EC] p-4">

            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9D9185]">
              Attending Personnel
            </div>

            <div className="mt-2 text-sm font-medium">
              {user.name}
            </div>

            <div className="mt-1 text-xs text-[#968B81]">

              {user.employeeId}

              {" · "}

              {user.role}

            </div>

          </div>


          {/* BACKEND MESSAGE */}

          <div className="mt-4 rounded-2xl border border-[#DCE4D8] bg-[#F5F9F2] px-4 py-3">

            <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#71846D]">
              Backend Connected
            </div>

            <div className="mt-1 text-xs leading-5 text-[#7E887A]">
              Procedure details will be saved to the SurgiTrack database before RFID registration begins.
            </div>

          </div>


          {/* ACTIONS */}

          <div className="mt-8 flex items-center justify-between border-t border-[#E9E1D8] pt-6">

            <button
              type="button"
              disabled={
                loading
              }
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="rounded-xl px-5 py-3 text-sm text-[#877A6F] transition hover:bg-[#F4ECE2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>


            <motion.button
              whileHover={
                !loading
                  ? {
                      y: -2,
                    }
                  : {}
              }
              whileTap={
                !loading
                  ? {
                      scale: 0.985,
                    }
                  : {}
              }
              disabled={
                loading
              }
              type="submit"
              className={`button-sheen relative flex h-12 min-w-[185px] items-center justify-center overflow-hidden rounded-xl px-6 text-sm font-semibold text-white ${
                loading
                  ? "cursor-wait bg-[#B59B80]"
                  : "bg-[#A27A53]"
              }`}
            >

              <span className="relative z-10 flex items-center gap-3">

                {loading ? (
                  <>

                    <LoaderCircle className="h-4 w-4 animate-spin" />

                    Creating...

                  </>
                ) : (
                  <>

                    Continue to RFID

                    <ArrowRight className="h-4 w-4" />

                  </>
                )}

              </span>

            </motion.button>

          </div>

        </motion.form>

      </main>

    </div>
  );
}


/* =========================================================
   INPUT
========================================================= */

function InputField({
  label,
  icon: Icon,
  disabled,
  ...props
}) {
  return (
    <div>

      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8E8378]">
        {label}
      </label>

      <div
        className={`flex h-14 items-center gap-3 rounded-2xl border border-[#DDD3C7] bg-[#FAF6F0] px-4 transition focus-within:border-[#B88F66] ${
          disabled
            ? "opacity-60"
            : ""
        }`}
      >

        <Icon className="h-4 w-4 shrink-0 text-[#A1978C]" />

        <input
          {...props}
          disabled={
            disabled
          }
          className="h-full w-full bg-transparent text-sm outline-none placeholder:text-[#B1A69B] disabled:cursor-not-allowed"
        />

      </div>

    </div>
  );
}


/* =========================================================
   SELECT
========================================================= */

function SelectField({
  label,
  icon: Icon,
  children,
  disabled,
  ...props
}) {
  return (
    <div>

      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8E8378]">
        {label}
      </label>

      <div
        className={`flex h-14 items-center gap-3 rounded-2xl border border-[#DDD3C7] bg-[#FAF6F0] px-4 transition focus-within:border-[#B88F66] ${
          disabled
            ? "opacity-60"
            : ""
        }`}
      >

        <Icon className="h-4 w-4 shrink-0 text-[#A1978C]" />

        <select
          {...props}
          disabled={
            disabled
          }
          className="h-full w-full bg-transparent text-sm outline-none disabled:cursor-not-allowed"
        >
          {children}
        </select>

      </div>

    </div>
  );
}