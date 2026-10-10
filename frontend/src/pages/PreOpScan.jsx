import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  Upload,
  X,
} from "lucide-react";

import {
  getProcedure,
  getProcedureInstruments,
  updateProcedureStatus,
  uploadProcedureImage,
} from "../services/api";

import {
  getCurrentProcedure,
  getCurrentProcedureId,
  setPreOpCaptured,
} from "../utils/demoStore";


function preOpVisionKey(
  procedureId
) {
  return (
    `surgitrack_procedure_${procedureId}_preop_vision`
  );
}


function normalizeVisionResult(
  response
) {
  const result =
    response?.vision ??
    response?.result ??
    response?.cnn ??
    response ??
    {};

  return {
    mode:
      result?.mode ??
      "pre_op",

    detections:
      Array.isArray(
        result?.detections
      )
        ? result.detections
        : [],

    counts:
      result?.counts &&
      typeof result.counts ===
        "object"
        ? result.counts
        : {},

    total:
      Number(
        result?.total ??
          0
      ),

    candidate_regions:
      Number(
        result?.candidate_regions ??
          0
      ),

    models_run:
      Number(
        result?.models_run ??
          1
      ),

    template_mode:
      Boolean(
        result?.template_mode
      ),
  };
}


function getInstrumentName(
  item
) {
  return (
    item?.instrument?.name ??
    item?.instrument_name ??
    item?.name ??
    "Instrument"
  );
}


export default function PreOpScan() {
  const navigate =
    useNavigate();

  const videoRef =
    useRef(null);

  const canvasRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const fileInputRef =
    useRef(null);

  const storedProcedure =
    getCurrentProcedure();

  const procedureId =
    getCurrentProcedureId() ??
    storedProcedure?.id ??
    null;

  const [
    procedure,
    setProcedure,
  ] = useState(
    storedProcedure ??
      null
  );

  const [
    instruments,
    setInstruments,
  ] = useState([]);

  const [
    loadingPage,
    setLoadingPage,
  ] = useState(true);

  const [
    cameraActive,
    setCameraActive,
  ] = useState(false);

  const [
    cameraLoading,
    setCameraLoading,
  ] = useState(false);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    sourceType,
    setSourceType,
  ] = useState("");

  const [
    analyzing,
    setAnalyzing,
  ] = useState(false);

  const [
    visionResult,
    setVisionResult,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  /* =====================================================
     LOAD PAGE
  ===================================================== */

  useEffect(() => {
    const loadPage =
      async () => {
        if (!procedureId) {
          setError(
            "No active procedure found."
          );

          setLoadingPage(
            false
          );

          return;
        }

        try {
          const [
            procedureData,
            instrumentData,
          ] =
            await Promise.all([
              getProcedure(
                procedureId
              ),

              getProcedureInstruments(
                procedureId
              ),
            ]);

          setProcedure(
            procedureData
          );

          setInstruments(
            Array.isArray(
              instrumentData
            )
              ? instrumentData
              : []
          );


          const storedVision =
            localStorage.getItem(
              preOpVisionKey(
                procedureId
              )
            );

          if (storedVision) {
            try {
              setVisionResult(
                JSON.parse(
                  storedVision
                )
              );
            } catch {
              // Ignore invalid old value.
            }
          }
        } catch (
          loadError
        ) {
          setError(
            loadError?.message ??
              "Unable to load pre-op data."
          );
        } finally {
          setLoadingPage(
            false
          );
        }
      };

    loadPage();
  }, [procedureId]);


  /* =====================================================
     CLEANUP
  ===================================================== */

  useEffect(() => {
    return () => {
      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }
    };
  }, []);


  useEffect(() => {
    return () => {
      if (
        previewUrl &&
        previewUrl.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);


  /* =====================================================
     CAMERA
  ===================================================== */

  const stopCamera =
    () => {
      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            (track) =>
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

      setCameraActive(
        false
      );
    };


  const startCamera =
    async () => {
      setCameraLoading(
        true
      );

      setError("");

      try {
        stopCamera();

        if (
          !navigator
            .mediaDevices
            ?.getUserMedia
        ) {
          throw new Error(
            "Camera unavailable."
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
                    ideal:
                      1920,
                  },

                  height: {
                    ideal:
                      1080,
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

        setCameraActive(
          true
        );
      } catch (
        cameraError
      ) {
        console.error(
          cameraError
        );

        setError(
          "Unable to open camera. Use Upload Image instead."
        );
      } finally {
        setCameraLoading(
          false
        );
      }
    };


  /* =====================================================
     FILE
  ===================================================== */

  const applyFile =
    (
      file,
      source
    ) => {
      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        setError(
          "Please select an image."
        );

        return;
      }

      if (
        previewUrl &&
        previewUrl.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      setSelectedFile(
        file
      );

      setPreviewUrl(
        URL.createObjectURL(
          file
        )
      );

      setSourceType(
        source
      );

      setVisionResult(
        null
      );

      setPreOpCaptured(
        false
      );

      localStorage.removeItem(
        preOpVisionKey(
          procedureId
        )
      );

      setError("");
      setSuccess("");
    };


  const handleUpload =
    (
      event
    ) => {
      const file =
        event.target.files?.[0];

      applyFile(
        file,
        "upload"
      );

      event.target.value =
        "";
    };


  const captureImage =
    () => {
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
        setError(
          "Camera is still starting."
        );

        return;
      }

      canvas.width =
        video.videoWidth;

      canvas.height =
        video.videoHeight;

      const context =
        canvas.getContext(
          "2d"
        );

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError(
              "Unable to capture image."
            );

            return;
          }

          const file =
            new File(
              [
                blob,
              ],
              `pre_op_${Date.now()}.jpg`,
              {
                type:
                  "image/jpeg",
              }
            );

          applyFile(
            file,
            "camera"
          );

          stopCamera();
        },
        "image/jpeg",
        0.95
      );
    };


  /* =====================================================
     ANALYSE
  ===================================================== */

  const analyzeImage =
    async () => {
      if (!selectedFile) {
        setError(
          "Upload or capture an image first."
        );

        return;
      }

      setAnalyzing(
        true
      );

      setError("");
      setSuccess("");

      try {
        const response =
          await uploadProcedureImage(
            procedureId,
            "pre_op",
            selectedFile
          );

        const result =
          normalizeVisionResult(
            response
          );

        setVisionResult(
          result
        );

        localStorage.setItem(
          preOpVisionKey(
            procedureId
          ),
          JSON.stringify(
            result
          )
        );

        setPreOpCaptured(
          true
        );

        setSuccess(
          "Pre-op reference baseline saved."
        );
      } catch (
        analyzeError
      ) {
        console.error(
          analyzeError
        );

        setPreOpCaptured(
          false
        );

        setError(
          analyzeError?.message ??
            "Pre-op scan failed."
        );
      } finally {
        setAnalyzing(
          false
        );
      }
    };


  const resetImage =
    () => {
      stopCamera();

      setSelectedFile(
        null
      );

      setPreviewUrl(
        ""
      );

      setSourceType(
        ""
      );

      setVisionResult(
        null
      );

      setPreOpCaptured(
        false
      );

      localStorage.removeItem(
        preOpVisionKey(
          procedureId
        )
      );

      setError("");
      setSuccess("");
    };


  /* =====================================================
     CONTINUE
  ===================================================== */

  const continueToProcedure =
    async () => {
      if (!visionResult) {
        setError(
          "Run the pre-op scan first."
        );

        return;
      }

      try {
        await updateProcedureStatus(
          procedureId,
          "active"
        );
      } catch (
        statusError
      ) {
        console.warn(
          statusError
        );
      }

      navigate(
        "/procedure-active"
      );
    };


  if (loadingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
        <LoaderCircle className="h-9 w-9 animate-spin text-[#826B4E]" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#F5F0E8] px-5 py-6 text-[#2D2A26] sm:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#9A8160]">
              SurgiTrack
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Pre-Op Reference Scan
            </h1>

            <p className="mt-2 text-sm text-[#7B7166]">
              {procedure?.procedure_name ??
                "Current Procedure"}
            </p>
          </div>

          <button
            onClick={() =>
              navigate(
                "/rfid-registration"
              )
            }
            className="flex items-center gap-2 rounded-xl border border-[#D8CCBD] bg-white px-4 py-3 font-bold"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>


        <div className="mb-6 rounded-3xl border border-[#E3D9CC] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">
            RFID Registered Instruments
          </h2>

          <div className="flex flex-wrap gap-2">
            {instruments.map(
              (
                instrument,
                index
              ) => (
                <span
                  key={
                    instrument?.id ??
                    instrument?.instrument_rfid_uid ??
                    index
                  }
                  className="rounded-full bg-[#F2ECE3] px-4 py-2 text-sm font-bold"
                >
                  {getInstrumentName(
                    instrument
                  )}
                </span>
              )
            )}
          </div>
        </div>


        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

          <div className="rounded-3xl border border-[#E3D9CC] bg-white p-5 shadow-sm">

            <h2 className="text-xl font-bold">
              Reference Tray
            </h2>

            <p className="mb-5 mt-1 text-sm text-[#82786D]">
              Upload the reference tray image or capture it with the camera.
            </p>


            {cameraActive &&
              !previewUrl && (
                <div className="overflow-hidden rounded-2xl bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="aspect-video w-full object-contain"
                  />
                </div>
              )}


            {previewUrl && (
              <div className="relative overflow-hidden rounded-2xl bg-[#EEEAE3]">
                <img
                  src={previewUrl}
                  alt="Pre-op tray"
                  className="max-h-[600px] w-full object-contain"
                />

                <button
                  onClick={
                    resetImage
                  }
                  className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white"
                >
                  <X size={18} />
                </button>
              </div>
            )}


            {!cameraActive &&
              !previewUrl && (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D7C9B8] bg-[#FAF8F4]">
                  <ImagePlus
                    size={50}
                    className="mb-3 text-[#A58A66]"
                  />

                  <p className="font-bold">
                    Select the pre-op tray image
                  </p>
                </div>
              )}


            <canvas
              ref={canvasRef}
              className="hidden"
            />


            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              {!cameraActive ? (
                <button
                  onClick={
                    startCamera
                  }
                  disabled={
                    cameraLoading ||
                    analyzing
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#2D2A26] px-4 py-3 font-bold text-white disabled:opacity-40"
                >
                  {cameraLoading ? (
                    <LoaderCircle className="animate-spin" size={18} />
                  ) : (
                    <Camera size={18} />
                  )}

                  Open Camera
                </button>
              ) : (
                <button
                  onClick={
                    captureImage
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#2D2A26] px-4 py-3 font-bold text-white"
                >
                  <Camera size={18} />
                  Capture
                </button>
              )}


              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={
                  analyzing
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-[#CCBCA7] bg-[#F6EFE5] px-4 py-3 font-bold"
              >
                <Upload size={18} />
                Upload Image
              </button>


              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={
                  handleUpload
                }
                className="hidden"
              />


              {selectedFile && (
                <button
                  onClick={
                    analyzeImage
                  }
                  disabled={
                    analyzing
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#826A4B] px-4 py-3 font-bold text-white disabled:opacity-40 sm:col-span-2"
                >
                  {analyzing ? (
                    <>
                      <LoaderCircle className="animate-spin" size={18} />
                      Analysing...
                    </>
                  ) : (
                    <>
                      <ScanLine size={18} />
                      Set Pre-Op Baseline
                    </>
                  )}
                </button>
              )}


              {selectedFile && (
                <button
                  onClick={
                    resetImage
                  }
                  disabled={
                    analyzing
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#D8CCBD] px-4 py-3 font-bold sm:col-span-2"
                >
                  <RefreshCw size={18} />
                  Choose Another Image
                </button>
              )}

            </div>

            {sourceType && (
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#94826B]">
                Source: {sourceType}
              </p>
            )}
          </div>


          <div className="space-y-5">

            <div className="rounded-3xl border border-[#E3D9CC] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">
                Pre-Op Baseline
              </h2>

              {!visionResult ? (
                <p className="mt-3 text-sm text-[#82786D]">
                  Upload the supplied reference image and set the baseline.
                </p>
              ) : (
                <>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <Metric
                      label="Regions"
                      value={
                        visionResult.candidate_regions
                      }
                    />

                    <Metric
                      label="Detected"
                      value={
                        visionResult.total
                      }
                    />

                    <Metric
                      label="Models"
                      value={
                        visionResult.models_run
                      }
                    />
                  </div>

                  <div className="mt-5 space-y-3">
                    {Object.entries(
                      visionResult.counts
                    ).map(
                      ([
                        name,
                        count,
                      ]) => (
                        <div
                          key={
                            name
                          }
                          className="flex items-center justify-between rounded-xl bg-[#F6F2EC] px-4 py-3"
                        >
                          <span className="font-bold">
                            {name}
                          </span>

                          <span className="text-xl font-black">
                            {count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>


            {success && (
              <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700">
                <CheckCircle2 size={21} />
                {success}
              </div>
            )}


            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
                {error}
              </div>
            )}


            <button
              onClick={
                continueToProcedure
              }
              disabled={
                !visionResult ||
                analyzing
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2D2A26] px-5 py-4 font-bold text-white disabled:opacity-40"
            >
              Start Procedure
              <ArrowRight size={19} />
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}


function Metric({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-[#F4EFE7] p-4 text-center">
      <p className="text-2xl font-black">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold uppercase text-[#81766A]">
        {label}
      </p>
    </div>
  );
}