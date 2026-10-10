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
  LoaderCircle,
  LockKeyhole,
  RadioTower,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import {
  loginUser,
} from "../services/api";

import {
  saveAuthToken,
  saveCurrentUser,
} from "../utils/demoStore";


export default function Login() {
  const navigate =
    useNavigate();

  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  /* =====================================================
     LOGIN
  ===================================================== */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      const cleanEmployeeId =
        employeeId
          .trim()
          .toUpperCase();

      if (!cleanEmployeeId) {
        setError(
          "Enter your Employee ID."
        );

        return;
      }

      if (!password) {
        setError(
          "Enter your password."
        );

        return;
      }

      setLoading(true);
      setError("");

      try {
        /*
         * FastAPI:
         *
         * POST /auth/login
         */

        const result =
          await loginUser(
            cleanEmployeeId,
            password
          );

        if (
          !result?.access_token ||
          !result?.user
        ) {
          throw new Error(
            "Invalid authentication response."
          );
        }

        /*
         * Save JWT.
         */

        saveAuthToken(
          result.access_token
        );

        /*
         * IMPORTANT:
         *
         * Name and role are NOT taken
         * from the login form.
         *
         * They come from SQLite through
         * FastAPI.
         */

        saveCurrentUser({
          name:
            result.user.name,

          employeeId:
            result.user
              .employee_id,

          role:
            result.user.role,

          email:
            result.user.email,
        });

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      } catch (
        loginError
      ) {
        console.error(
          "Login failed:",
          loginError
        );

        setError(
          loginError.message ||
            "Unable to sign in."
        );
      } finally {
        setLoading(false);
      }
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

            x: [
              0,
              -10,
              0,
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

        <motion.div
          animate={{
            x: [
              0,
              50,
              -20,
              0,
            ],

            y: [
              0,
              20,
              -15,
              0,
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-36 -top-32 h-[30rem] w-[30rem] rounded-full bg-[#DCC7AE]/35 blur-[110px]"
        />

      </div>


      {/* HEADER */}

      <header className="relative z-20 flex min-h-[82px] items-center justify-between px-6 py-5 lg:px-14">

        <motion.div
          initial={{
            opacity: 0,
            x: -20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          className="flex items-center gap-3"
        >

          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#CDBA9D] bg-[#FFFDF9]/90 shadow-[0_10px_30px_rgba(91,73,49,.08)] backdrop-blur-xl">

            <ScanLine className="h-5 w-5 text-[#9B744C]" />

            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#7B9A7C]" />

          </div>

          <div>

            <h1 className="text-base font-semibold tracking-[0.18em] sm:text-lg">
              SURGITRACK
            </h1>

            <p className="text-[10px] text-[#8A8177] sm:text-[11px]">
              Surgical Instrument Verification
            </p>

          </div>

        </motion.div>

        <div className="hidden items-center gap-2 rounded-full border border-[#B8C7B3] bg-[#F7FBF4]/85 px-4 py-2 text-[11px] font-medium text-[#637B63] backdrop-blur md:flex">

          <span className="h-2 w-2 animate-pulse rounded-full bg-[#769377]" />

          SECURE ACCESS

        </div>

      </header>


      {/* MAIN */}

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-82px)] max-w-[1450px] grid-cols-1 items-center gap-10 px-6 py-8 lg:grid-cols-[1.05fr_.95fr] lg:px-14 lg:py-10">

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
          transition={{
            duration: 0.9,
          }}
          className="hidden lg:block"
        >

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D8C7B2] bg-[#FFFDF9]/70 px-4 py-2 text-xs font-medium tracking-wide text-[#8B6845] backdrop-blur-xl">

            <ShieldCheck className="h-4 w-4" />

            OPERATING THEATRE SAFETY SYSTEM

          </div>

          <h2 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] text-[#302D29] xl:text-7xl">

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

            <SystemTile
              icon={
                RadioTower
              }
              title="RFID"
              text="Identity tracking"
            />

            <SystemTile
              icon={
                Activity
              }
              title="Vision"
              text="Tray verification"
            />

            <SystemTile
              icon={
                ShieldCheck
              }
              title="Reconcile"
              text="Final status"
            />

          </div>

        </motion.section>


        {/* LOGIN CARD */}

        <motion.section
          initial={{
            opacity: 0,
            y: 30,
            scale: 0.98,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.7,
          }}
          className="mx-auto w-full max-w-[510px]"
        >

          <div className="relative overflow-hidden rounded-[32px] border border-[#D7CCBE] bg-[#FFFDF9]/90 shadow-[0_28px_90px_rgba(88,68,46,.14)] backdrop-blur-2xl">

            <motion.div
              animate={{
                opacity: [
                  0.3,
                  0.8,
                  0.3,
                ],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
              className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#B68A5A] to-transparent"
            />


            <div className="p-7 sm:p-9">

              {/* LOGIN HEADER */}

              <div className="mb-8">

                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D8C9B7] bg-[#F5EEE6]">

                  <LockKeyhole className="h-5 w-5 text-[#956E46]" />

                </div>

                <p className="mb-2 text-[11px] font-semibold tracking-[0.19em] text-[#9B744C]">

                  AUTHORIZED PERSONNEL

                </p>

                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">

                  Sign in

                </h3>

                <p className="mt-2 text-sm leading-6 text-[#8A8177]">

                  Use your registered hospital Employee ID to access SurgiTrack.

                </p>

              </div>


              {/* FORM */}

              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >

                {/* EMPLOYEE ID */}

                <div>

                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8D8379]">

                    Employee ID

                  </label>

                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#DED4C8] bg-[#F9F5EF]/90 px-4 transition focus-within:border-[#B78D62] focus-within:bg-[#FFFDF9]">

                    <BadgeCheck className="h-4 w-4 shrink-0 text-[#A1978B]" />

                    <input
                      autoComplete="username"
                      value={
                        employeeId
                      }
                      onChange={(
                        event
                      ) => {
                        setEmployeeId(
                          event.target.value
                        );

                        if (error) {
                          setError("");
                        }
                      }}
                      disabled={
                        loading
                      }
                      placeholder="Enter employee ID"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm uppercase outline-none placeholder:normal-case placeholder:text-[#B4AAA0]"
                    />

                  </div>

                </div>


                {/* PASSWORD */}

                <div>

                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8D8379]">

                    Password

                  </label>

                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#DED4C8] bg-[#F9F5EF]/90 px-4 transition focus-within:border-[#B78D62] focus-within:bg-[#FFFDF9]">

                    <LockKeyhole className="h-4 w-4 shrink-0 text-[#A1978B]" />

                    <input
                      autoComplete="current-password"
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
                      ) => {
                        setPassword(
                          event.target.value
                        );

                        if (error) {
                          setError("");
                        }
                      }}
                      disabled={
                        loading
                      }
                      placeholder="Enter password"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#B4AAA0]"
                    />

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      className="shrink-0 text-[#9A9188] transition hover:text-[#655D56]"
                    >

                      {showPassword ? (

                        <EyeOff className="h-4 w-4" />

                      ) : (

                        <Eye className="h-4 w-4" />

                      )}

                    </button>

                  </div>

                </div>


                {/* ERROR */}

                {error && (

                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="rounded-xl border border-[#E3C6BF] bg-[#FBF0ED] px-4 py-3 text-xs leading-5 text-[#A15E54]"
                  >

                    {error}

                  </motion.div>

                )}


                {/* LOGIN BUTTON */}

                <motion.button
                  whileHover={
                    !loading
                      ? {
                          y: -2,
                          scale: 1.01,
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
                  className={`button-sheen relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl text-sm font-semibold text-white shadow-[0_14px_35px_rgba(137,98,61,.22)] ${
                    loading
                      ? "cursor-wait bg-[#AF957B]"
                      : "bg-[#A47B52]"
                  }`}
                >

                  <span className="relative z-10 flex items-center gap-3">

                    {loading ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />

                        Verifying Credentials...
                      </>
                    ) : (
                      <>
                        Access SurgiTrack

                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}

                  </span>

                </motion.button>

              </form>


              {/* FOOTER */}

              <div className="mt-7 border-t border-[#E8DFD5] pt-5">

                <div className="flex items-center gap-2 text-[10px] leading-5 tracking-wide text-[#A69C91]">

                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />

                  Profile name and hospital role are verified from the registered employee account.

                </div>

              </div>

            </div>

          </div>

        </motion.section>

      </main>

    </div>
  );
}


/* =========================================================
   FEATURE TILE
========================================================= */

function SystemTile({
  icon: Icon,
  title,
  text,
}) {
  return (
    <motion.div
      whileHover={{
        y: -7,
      }}
      className="rounded-[20px] border border-[#DCD1C4] bg-[#FFFDF9]/65 p-4 backdrop-blur-xl"
    >

      <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1E9DE]">

        <Icon className="h-4 w-4 text-[#9A724A]" />

      </div>

      <div className="text-sm font-semibold">
        {title}
      </div>

      <div className="mt-1 text-xs text-[#8A8177]">
        {text}
      </div>

    </motion.div>
  );
}