import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  RadioTower,
  ScanLine,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  saveCurrentUser,
} from "../utils/demoStore";

const roles = [
  "OT Technician",
  "Surgeon / Doctor",
  "Anaesthesiologist",
  "Scrub Nurse",
  "Circulating Nurse",
  "Theatre Nurse",
  "Administrator",
];

export default function Login() {
  const navigate =
    useNavigate();

  const [
    name,
    setName,
  ] = useState("");

  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    role,
    setRole,
  ] = useState(
    "OT Technician"
  );

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    const cleanName =
      name.trim();

    const cleanEmployeeId =
      employeeId.trim();

    if (!cleanName) {
      setError(
        "Enter your name."
      );

      return;
    }

    if (!cleanEmployeeId) {
      setError(
        "Enter your Employee ID."
      );

      return;
    }

    if (!password.trim()) {
      setError(
        "Enter your password."
      );

      return;
    }

    setError("");

    saveCurrentUser({
      name:
        cleanName,

      employeeId:
        cleanEmployeeId,

      role,
    });

    navigate(
      "/dashboard",
      {
        replace: true,
      }
    );
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F5F0E8] text-[#2B2925]">

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <motion.div
          initial={{
            scale: 1.03,
          }}
          animate={{
            scale: [
              1.03,
              1.08,
              1.03,
            ],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-[url('/hospital-bg.jpg')] bg-cover bg-center"
          style={{
            opacity: 0.42,

            filter:
              "saturate(.72) contrast(.93) brightness(1.03)",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/94 via-[#F5F0E8]/70 to-[#F5F0E8]/32" />

        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F0E8]/15 via-transparent to-[#F5F0E8]/62" />

      </div>

      {/* HEADER */}

      <header className="relative z-20 flex min-h-[82px] items-center justify-between px-6 py-5 lg:px-14">

        <div className="flex items-center gap-3">

          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#CDBA9D] bg-[#FFFDF9]/90">

            <ScanLine className="h-5 w-5 text-[#9B744C]" />

            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#7B9A7C]" />

          </div>

          <div>

            <h1 className="text-lg font-semibold tracking-[0.18em]">
              SURGITRACK
            </h1>

            <p className="text-[11px] text-[#8A8177]">
              Surgical Instrument Verification
            </p>

          </div>

        </div>

        <div className="hidden items-center gap-2 rounded-full border border-[#B8C7B3] bg-[#F7FBF4]/85 px-4 py-2 text-[11px] font-medium text-[#637B63] md:flex">

          <span className="h-2 w-2 animate-pulse rounded-full bg-[#769377]" />

          SYSTEM ONLINE

        </div>

      </header>

      {/* MAIN */}

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-82px)] max-w-[1450px] grid-cols-1 items-center gap-10 px-6 py-8 lg:grid-cols-[1.05fr_.95fr] lg:px-14">

        {/* LEFT */}

        <motion.section
          initial={{
            opacity: 0,
            x: -40,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          className="hidden lg:block"
        >

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D8C7B2] bg-[#FFFDF9]/70 px-4 py-2 text-xs font-medium text-[#8B6845]">

            <ShieldCheck className="h-4 w-4" />

            OPERATING THEATRE SAFETY SYSTEM

          </div>

          <h2 className="text-6xl font-semibold leading-[1.05] tracking-[-0.045em]">

            Every instrument.

            <br />

            <span className="bg-gradient-to-r from-[#96704A] via-[#B38A62] to-[#778B73] bg-clip-text text-transparent">
              Accounted for.
            </span>

          </h2>

          <p className="mt-7 max-w-xl text-[17px] leading-8 text-[#756E66]">

            RFID identity tracking,
            computer vision and digital
            surgical instrument
            reconciliation.

          </p>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">

            <Feature
              icon={
                RadioTower
              }
              title="RFID"
              text="Identity tracking"
            />

            <Feature
              icon={
                Activity
              }
              title="Vision"
              text="Tray verification"
            />

            <Feature
              icon={
                BadgeCheck
              }
              title="Reconcile"
              text="Final status"
            />

          </div>

        </motion.section>

        {/* LOGIN */}

        <motion.section
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mx-auto w-full max-w-[510px]"
        >

          <div className="rounded-[32px] border border-[#D7CCBE] bg-[#FFFDF9]/90 p-7 shadow-[0_28px_90px_rgba(88,68,46,.14)] backdrop-blur-2xl sm:p-9">

            <div className="mb-7">

              <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl border border-[#D8C9B7] bg-[#F5EEE6]">

                <LockKeyhole className="h-5 w-5 text-[#956E46]" />

              </div>

              <div className="text-[11px] font-semibold tracking-[0.19em] text-[#9B744C]">
                SECURE ACCESS
              </div>

              <h2 className="mt-2 text-3xl font-semibold">
                Welcome
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#8A8177]">
                Sign in to your SurgiTrack profile.
              </p>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5"
            >

              {/* NAME */}

              <FormField
                label="Name"
                icon={
                  UserRound
                }
              >

                <input
                  value={
                    name
                  }
                  onChange={(
                    event
                  ) =>
                    setName(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Enter your name"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                />

              </FormField>

              {/* ID */}

              <FormField
                label="Employee ID"
                icon={
                  BadgeCheck
                }
              >

                <input
                  value={
                    employeeId
                  }
                  onChange={(
                    event
                  ) =>
                    setEmployeeId(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Enter employee ID"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                />

              </FormField>

              {/* PASSWORD */}

              <FormField
                label="Password"
                icon={
                  LockKeyhole
                }
              >

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Enter password"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  className="text-[#9A9188]"
                >

                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}

                </button>

              </FormField>

              {/* ROLE */}

              <div>

                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8D8379]">
                  Hospital Role
                </label>

                <div className="flex h-13 items-center rounded-2xl border border-[#DED4C8] bg-[#F9F5EF]/90 px-4">

                  <select
                    value={
                      role
                    }
                    onChange={(
                      event
                    ) =>
                      setRole(
                        event
                          .target
                          .value
                      )
                    }
                    className="h-full w-full bg-transparent text-sm outline-none"
                  >

                    {roles.map(
                      (
                        item
                      ) => (

                        <option
                          key={
                            item
                          }
                          value={
                            item
                          }
                        >
                          {item}
                        </option>

                      )
                    )}

                  </select>

                </div>

              </div>

              {error && (

                <div className="rounded-xl border border-[#E3C6BF] bg-[#FBF0ED] px-4 py-3 text-xs text-[#A15E54]">

                  {error}

                </div>

              )}

              <motion.button
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.985,
                }}
                type="submit"
                className="button-sheen relative flex h-13 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#A47B52] text-sm font-semibold text-white"
              >

                <span className="relative z-10 flex items-center gap-3">

                  Access SurgiTrack

                  <ArrowRight className="h-4 w-4" />

                </span>

              </motion.button>

            </form>

          </div>

        </motion.section>

      </main>

    </div>
  );
}

function FormField({
  label,
  icon: Icon,
  children,
}) {
  return (
    <div>

      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8D8379]">
        {label}
      </label>

      <div className="flex h-13 items-center gap-3 rounded-2xl border border-[#DED4C8] bg-[#F9F5EF]/90 px-4 focus-within:border-[#B78D62]">

        <Icon className="h-4 w-4 shrink-0 text-[#A1978B]" />

        {children}

      </div>

    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}) {
  return (
    <motion.div
      whileHover={{
        y: -6,
      }}
      className="rounded-[20px] border border-[#DCD1C4] bg-[#FFFDF9]/65 p-4"
    >

      <Icon className="h-5 w-5 text-[#9A724A]" />

      <div className="mt-5 text-sm font-semibold">
        {title}
      </div>

      <div className="mt-1 text-xs text-[#8A8177]">
        {text}
      </div>

    </motion.div>
  );
}