import {
  useEffect,
  useRef,
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
  Camera,
  CameraOff,
  CheckCircle2,
  Eye,
  LoaderCircle,
  RadioTower,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";

import {
  getCurrentProcedure,
  getCurrentUser,
  getRfidScans,
  setPreOpCaptured,
} from "../utils/demoStore";

export default function PreOpScan() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const user = getCurrentUser();
  const procedure = getCurrentProcedure();
  const scans = getRfidScans();

  const [
    cameraActive,
    setCameraActive,
  ] = useState(false);

  const [
    cameraLoading,
    setCameraLoading,
  ] = useState(false);

  const [
    cameraError,
    setCameraError,
  ] = useState("");

  const [
    scanStatus,
    setScanStatus,
  ] = useState("idle");

  const [
    capturedImage,
    setCapturedImage,
  ] = useState(null);

  /* =====================================================
     CLEANUP
  ===================================================== */

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  /* =====================================================
     START CAMERA
  ===================================================== */

  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError("");

    setCapturedImage(null);
    setScanStatus("idle");

    /*
     * Starting/restarting the camera means
     * this scan is not complete yet.
     */

    setPreOpCaptured(false);

    try {
      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        streamRef.current =
          null;
      }

      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        throw new Error(
          "Camera access requires localhost or HTTPS."
        );
      }

      let stream;

      try {
        stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal:
                    "environment",
                },

                width: {
                  ideal: 1920,
                },

                height: {
                  ideal: 1080,
                },
              },

              audio: false,
            }
          );
      } catch {
        stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: false,
            }
          );
      }

      streamRef.current =
        stream;

      if (
        videoRef.current
      ) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (error) {
      console.error(
        "Camera error:",
        error
      );

      setCameraActive(false);

      setCameraError(
        "Unable to access the camera. Allow camera permission and try again."
      );
    } finally {
      setCameraLoading(false);
    }
  };

  /* =====================================================
     STOP CAMERA
  ===================================================== */

  const stopCamera = () => {
    if (
      streamRef.current
    ) {
      streamRef.current
        .getTracks()
        .forEach((track) =>
          track.stop()
        );

      streamRef.current =
        null;
    }

    if (
      videoRef.current
    ) {
      videoRef.current.srcObject =
        null;
    }

    setCameraActive(false);
  };

  /* =====================================================
     CAPTURE FRAME
  ===================================================== */

  const captureFrame = () => {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    if (
      !video ||
      !canvas ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return null;
    }

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    const context =
      canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL(
      "image/jpeg",
      0.92
    );
  };

  /* =====================================================
     SCAN PRE-OP TRAY
  ===================================================== */

  const scanTray = () => {
    if (!cameraActive) {
      return;
    }

    const frame =
      captureFrame();

    if (!frame) {
      setCameraError(
        "Camera is still starting. Wait a moment and try again."
      );

      return;
    }

    setCameraError("");
    setScanStatus(
      "scanning"
    );

    setPreOpCaptured(
      false
    );

    if (timerRef.current) {
      clearTimeout(
        timerRef.current
      );
    }

    timerRef.current =
      setTimeout(() => {
        setCapturedImage(
          frame
        );

        /*
         * IMPORTANT
         *
         * This is what Final Reconciliation
         * reads later.
         */

        setPreOpCaptured(
          true
        );

        setScanStatus(
          "complete"
        );
      }, 2000);
  };

  /* =====================================================
     RESCAN
  ===================================================== */

  const rescanTray = () => {
    setPreOpCaptured(
      false
    );

    setCapturedImage(
      null
    );

    setScanStatus(
      "idle"
    );

    setCameraError("");
  };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const goBack = () => {
    stopCamera();

    navigate(
      "/rfid-registration"
    );
  };

  const continueToProcedure =
    () => {
      if (
        scanStatus !==
        "complete"
      ) {
        return;
      }

      stopCamera();

      navigate(
        "/procedure-active"
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
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-[url('/doctors-bg.jpg')] bg-cover bg-center"
          style={{
            opacity: 0.15,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/98 via-[#F5F0E8]/91 to-[#F5F0E8]/61" />

      </div>

      {/* HEADER */}

      <header className="relative z-40 border-b border-[#DED5CA] bg-[#FAF7F2]/82 backdrop-blur-2xl">

        <div className="mx-auto flex h-[78px] max-w-[1600px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-4">

            <motion.button
              whileHover={{
                x: -3,
              }}
              onClick={goBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD2C5] bg-[#FFFDF9] text-[#897D72]"
            >

              <ArrowLeft className="h-4 w-4" />

            </motion.button>

            <div className="flex items-center gap-3">

              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4C5B3] bg-[#FFFDF9]">

                <Camera className="h-5 w-5 text-[#9A724A]" />

                <span
                  className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${
                    cameraActive
                      ? "animate-pulse bg-[#789477]"
                      : "bg-[#BDB3A8]"
                  }`}
                />

              </div>

              <div>

                <div className="text-sm font-semibold tracking-[0.14em]">
                  SURGITRACK
                </div>

                <div className="text-[10px] text-[#9D9287]">
                  PRE-OPERATIVE VISION
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

            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D2C3B1] bg-[#F6EEE4]">

              <UserRound className="h-4 w-4 text-[#9A724A]" />

            </div>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-9 lg:px-8">

        <div className="mb-7">

          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A724A]">

            <Eye className="h-4 w-4" />

            Live Computer Vision

          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.035em] lg:text-4xl">

            Pre-operative tray scan

          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#877D73]">

            Position the complete prepared surgical tray inside
            the live camera frame.

          </p>

        </div>

        {/* STATUS */}

        <div className="mb-6 flex flex-wrap gap-3">

          <StatusBox
            icon={
              RadioTower
            }
            label={`${scans.length} RFID tags`}
          />

          <StatusBox
            icon={
              cameraActive
                ? Video
                : CameraOff
            }
            label={
              cameraActive
                ? "Camera Live"
                : "Camera Offline"
            }
          />

          <StatusBox
            icon={
              ShieldCheck
            }
            label={
              procedure?.caseId ||
              "No active case"
            }
          />

        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">

          {/* CAMERA */}

          <section className="overflow-hidden rounded-[28px] border border-[#D9CDBF] bg-[#FFFDF9]/88 shadow-[0_20px_55px_rgba(80,62,42,.07)]">

            <div className="flex items-center justify-between border-b border-[#E8E0D7] px-6 py-5">

              <div>

                <h2 className="font-semibold">
                  Live tray camera
                </h2>

                <p className="mt-1 text-xs text-[#958B81]">
                  Pre-operative baseline
                </p>

              </div>

              <div
                className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold ${
                  cameraActive
                    ? "border-[#C7D2C1] bg-[#F4F8F1] text-[#698067]"
                    : "border-[#DDD3C7] bg-[#F6F1EB] text-[#998E84]"
                }`}
              >

                {cameraActive
                  ? "LIVE"
                  : "OFFLINE"}

              </div>

            </div>

            <div className="p-6">

              <div className="relative min-h-[540px] overflow-hidden rounded-[26px] bg-[#292622]">

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`absolute inset-0 h-full w-full object-cover ${
                    cameraActive &&
                    !capturedImage
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                />

                {capturedImage && (

                  <img
                    src={
                      capturedImage
                    }
                    alt="Pre-op tray"
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                )}

                <canvas
                  ref={canvasRef}
                  className="hidden"
                />

                {!cameraActive &&
                  !cameraLoading && (

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">

                    <Camera className="h-10 w-10 text-[#D8BA98]" />

                    <div className="mt-5 text-lg font-semibold text-white">
                      Start live camera
                    </div>

                    <button
                      onClick={
                        startCamera
                      }
                      className="mt-6 rounded-xl bg-[#B88A5B] px-6 py-3 text-sm font-semibold text-white"
                    >
                      Start Camera
                    </button>

                  </div>

                )}

                {cameraLoading && (

                  <div className="absolute inset-0 flex items-center justify-center">

                    <LoaderCircle className="h-8 w-8 animate-spin text-[#D7B58F]" />

                  </div>

                )}

                <AnimatePresence>

                  {scanStatus ===
                    "scanning" && (

                    <motion.div
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      exit={{
                        opacity: 0,
                      }}
                      className="absolute inset-0 bg-black/25"
                    >

                      <motion.div
                        initial={{
                          top: "8%",
                        }}
                        animate={{
                          top: "90%",
                        }}
                        transition={{
                          duration: 1.8,
                        }}
                        className="absolute left-[5%] right-[5%] h-[2px] bg-[#EAC59E]"
                      />

                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/65 px-8 py-6 text-center text-white">

                        <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />

                        <div className="mt-3 text-sm font-semibold">
                          Scanning tray
                        </div>

                      </div>

                    </motion.div>

                  )}

                </AnimatePresence>

                {scanStatus ===
                  "complete" && (

                  <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-[#F4FAF1] px-4 py-2 text-[10px] font-semibold text-[#668064]">

                    <CheckCircle2 className="h-4 w-4" />

                    PRE-OP READY

                  </div>

                )}

              </div>

              {cameraError && (

                <div className="mt-4 rounded-xl bg-[#FBF0ED] px-4 py-3 text-xs text-[#A15E54]">
                  {cameraError}
                </div>

              )}

              <div className="mt-5">

                {scanStatus ===
                "complete" ? (

                  <button
                    onClick={
                      rescanTray
                    }
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D2C4B5] bg-[#F7F1EA] text-sm font-semibold"
                  >

                    <RefreshCw className="h-4 w-4" />

                    Rescan Tray

                  </button>

                ) : (

                  <button
                    onClick={
                      scanTray
                    }
                    disabled={
                      !cameraActive ||
                      scanStatus ===
                        "scanning"
                    }
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
                      cameraActive &&
                      scanStatus !==
                        "scanning"
                        ? "bg-[#A27A53] text-white"
                        : "cursor-not-allowed bg-[#E5DDD4] text-[#AAA096]"
                    }`}
                  >

                    <ScanLine className="h-4 w-4" />

                    {scanStatus ===
                    "scanning"
                      ? "Scanning..."
                      : "Scan Tray"}

                  </button>

                )}

              </div>

            </div>

          </section>

          {/* RIGHT */}

          <div className="space-y-6">

            <section className="rounded-[28px] border border-[#DED3C6] bg-[#FFFDF9]/88 p-6">

              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#98704A]">
                Pre-Op Status
              </div>

              {scanStatus ===
              "complete" ? (

                <div className="mt-6 rounded-2xl border border-[#C4D4BE] bg-[#F2F8EF] p-5">

                  <CheckCircle2 className="h-6 w-6 text-[#70896E]" />

                  <div className="mt-3 text-sm font-semibold">
                    Baseline captured
                  </div>

                  <div className="mt-2 text-xs text-[#788876]">
                    Pre-operative acquisition is complete.
                  </div>

                </div>

              ) : (

                <div className="mt-6 rounded-2xl border border-dashed border-[#DDD2C5] p-6 text-center text-sm">
                  Awaiting tray scan
                </div>

              )}

            </section>

            <button
              onClick={
                continueToProcedure
              }
              disabled={
                scanStatus !==
                "complete"
              }
              className={`flex h-14 w-full items-center justify-center gap-3 rounded-2xl text-sm font-semibold ${
                scanStatus ===
                "complete"
                  ? "bg-[#A27A53] text-white"
                  : "cursor-not-allowed bg-[#E6DED5] text-[#AAA096]"
              }`}
            >

              Continue to Procedure

              <ArrowRight className="h-4 w-4" />

            </button>

            <button
              onClick={goBack}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D7CCBF] bg-[#FFFDF9]"
            >

              <ArrowLeft className="h-4 w-4" />

              Back to RFID

            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

function StatusBox({
  icon: Icon,
  label,
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#DED4C8] bg-[#FFFDF9]/82 px-4 py-2 text-xs">

      <Icon className="h-4 w-4 text-[#9A724A]" />

      {label}

    </div>
  );
}