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
  ScanLine,
  Stethoscope,
  UserRound,
} from "lucide-react";

import {
  clearActiveProcedureState,
  getCurrentUser,
  saveCurrentProcedure,
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

  const update = (
    field,
    value
  ) => {
    setForm(
      (
        current
      ) => ({
        ...current,
        [field]: value,
      })
    );
  };

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      !form.caseId.trim()
    ) {
      setError(
        "Enter the Case ID."
      );

      return;
    }

    if (
      !form.procedureName.trim()
    ) {
      setError(
        "Enter the procedure name."
      );

      return;
    }

    if (
      !form.surgeon.trim()
    ) {
      setError(
        "Enter the lead surgeon."
      );

      return;
    }

    setError("");

    /*
     * New procedure =
     * clean active workflow.
     *
     * History is NOT affected.
     */

    clearActiveProcedureState();

    saveCurrentProcedure({
      caseId:
        form.caseId.trim(),

      procedureName:
        form.procedureName.trim(),

      otRoom:
        form.otRoom,

      surgeon:
        form.surgeon.trim(),

      createdAt:
        new Date().toISOString(),

      status:
        "rfid-registration",
    });

    navigate(
      "/rfid-registration"
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F0E8] text-[#2D2A26]">

      <div className="pointer-events-none fixed inset-0">

        <div
          className="absolute inset-0 bg-[url('/doctors-bg.jpg')] bg-cover bg-center"
          style={{
            opacity: 0.18,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/98 via-[#F5F0E8]/90 to-[#F5F0E8]/60" />

      </div>

      {/* HEADER */}

      <header className="relative z-30 border-b border-[#DED5CA] bg-[#FAF7F2]/82 backdrop-blur-2xl">

        <div className="mx-auto flex h-[78px] max-w-[1500px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-4">

            <button
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

          <div className="hidden text-right sm:block">

            <div className="text-sm font-medium">
              {user.name}
            </div>

            <div className="text-[11px] text-[#968C82]">
              {user.role}
            </div>

          </div>

        </div>

      </header>

      {/* MAIN */}

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
            Create a fresh surgical procedure session.
          </p>

        </div>

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

            <InputField
              label="Case ID"
              icon={Hash}
              placeholder="Enter case ID"
              value={
                form.caseId
              }
              onChange={(
                event
              ) =>
                update(
                  "caseId",
                  event.target
                    .value
                )
              }
            />

            <SelectField
              label="Operating Theatre"
              icon={
                DoorOpen
              }
              value={
                form.otRoom
              }
              onChange={(
                event
              ) =>
                update(
                  "otRoom",
                  event.target
                    .value
                )
              }
            >

              <option>
                OT 01
              </option>

              <option>
                OT 02
              </option>

              <option>
                OT 03
              </option>

              <option>
                OT 04
              </option>

              <option>
                OT 05
              </option>

            </SelectField>

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
                onChange={(
                  event
                ) =>
                  update(
                    "procedureName",
                    event.target
                      .value
                  )
                }
              />

            </div>

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
                onChange={(
                  event
                ) =>
                  update(
                    "surgeon",
                    event.target
                      .value
                  )
                }
              />

            </div>

          </div>

          {error && (

            <div className="mt-6 rounded-xl border border-[#E3C6BF] bg-[#FBF0ED] px-4 py-3 text-xs text-[#A15E54]">

              {error}

            </div>

          )}

          <div className="mt-7 rounded-2xl border border-[#DDD2C5] bg-[#F8F3EC] p-4">

            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9D9185]">
              Attending Personnel
            </div>

            <div className="mt-2 text-sm font-medium">
              {user.name}
            </div>

            <div className="mt-1 text-xs text-[#968B81]">
              {user.employeeId} · {user.role}
            </div>

          </div>

          <div className="mt-8 flex items-center justify-between border-t border-[#E9E1D8] pt-6">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="rounded-xl px-5 py-3 text-sm text-[#877A6F]"
            >
              Cancel
            </button>

            <motion.button
              whileHover={{
                y: -2,
              }}
              type="submit"
              className="button-sheen relative flex h-12 items-center overflow-hidden rounded-xl bg-[#A27A53] px-6 text-sm font-semibold text-white"
            >

              <span className="relative z-10 flex items-center gap-3">

                Continue to RFID

                <ArrowRight className="h-4 w-4" />

              </span>

            </motion.button>

          </div>

        </motion.form>

      </main>

    </div>
  );
}

function InputField({
  label,
  icon: Icon,
  ...props
}) {
  return (
    <div>

      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8E8378]">
        {label}
      </label>

      <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#DDD3C7] bg-[#FAF6F0] px-4">

        <Icon className="h-4 w-4 text-[#A1978C]" />

        <input
          {...props}
          className="h-full w-full bg-transparent text-sm outline-none"
        />

      </div>

    </div>
  );
}

function SelectField({
  label,
  icon: Icon,
  children,
  ...props
}) {
  return (
    <div>

      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8E8378]">
        {label}
      </label>

      <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#DDD3C7] bg-[#FAF6F0] px-4">

        <Icon className="h-4 w-4 text-[#A1978C]" />

        <select
          {...props}
          className="h-full w-full bg-transparent text-sm outline-none"
        >
          {children}
        </select>

      </div>

    </div>
  );
}