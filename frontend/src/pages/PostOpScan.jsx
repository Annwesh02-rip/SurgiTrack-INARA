import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Radio,
  RefreshCw,
  ScanLine,
  Upload,
  X,
} from "lucide-react";

import {
  connectRFID,
  getProcedure,
  getProcedureInstruments,
  getRFIDStatus,
  scanRFID,
  updateProcedureStatus,
} from "../services/api";

import {
  getCurrentProcedure,
  getCurrentProcedureId,
  setPostOpCaptured,
} from "../utils/demoStore";


/* =========================================================
   STORAGE KEYS
========================================================= */

function preOpVisionKey(procedureId) {
  return `surgitrack_procedure_${procedureId}_preop_vision`;
}

function postOpVisionKey(procedureId) {
  return `surgitrack_procedure_${procedureId}_postop_vision`;
}

function comparisonKey(procedureId) {
  return `surgitrack_procedure_${procedureId}_postop_comparison`;
}

function postOpRFIDKey(procedureId) {
  return `surgitrack_procedure_${procedureId}_postop_rfid`;
}

function timingKey(procedureId) {
  return `surgitrack_procedure_${procedureId}_rfid_timing`;
}


/* =========================================================
   STORAGE HELPERS
========================================================= */

function readJson(
  key,
  fallback
) {
  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJson(
  key,
  value
) {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}


/* =========================================================
   NORMALIZATION
========================================================= */

function canonicalName(value) {
  const raw =
    String(value ?? "").trim();

  const key =
    raw.toLowerCase();

  if (
    key === "scissor" ||
    key === "scissors"
  ) {
    return "Scissors";
  }

  if (
    key === "scalpel" ||
    key === "scalpels"
  ) {
    return "Scalpel";
  }

  return raw;
}

function normalizeInstrument(item) {
  return {
    rfidUid:
      item?.instrument_rfid_uid ??
      item?.rfid_uid ??
      item?.instrument?.rfid_uid ??
      "",

    name:
      canonicalName(
        item?.instrument?.name ??
        item?.instrument_name ??
        item?.name ??
        "Instrument"
      ),
  };
}

function normalizeScan(response) {
  return {
    status:
      response?.status ??
      "waiting",

    rfidUid:
      response?.rfid_uid ??
      response?.uid ??
      response?.tag?.rfid_uid ??
      "",

    name:
      canonicalName(
        response?.instrument_name ??
        response?.instrument?.name ??
        response?.name ??
        "Instrument"
      ),
  };
}


/* =========================================================
   PRE-OP BASELINE
========================================================= */

function createPreOpBaseline() {
  return {
    mode: "pre_op",

    detections: [
      {
        class_name: "Scissors",
        confidence: 1,
      },
      {
        class_name: "Scalpel",
        confidence: 1,
      },
    ],

    counts: {
      Scissors: 1,
      Scalpel: 1,
    },

    total: 2,
    candidate_regions: 2,
    models_run: 1,
  };
}


/* =========================================================
   MATCHED POST-OP RESULT
========================================================= */

function createMatchedResult() {
  return {
    mode: "post_op",

    detections: [
      {
        class_name: "Scissors",
        confidence: 1,
      },
      {
        class_name: "Scalpel",
        confidence: 1,
      },
    ],

    counts: {
      Scissors: 1,
      Scalpel: 1,
    },

    total: 2,
    candidate_regions: 2,
    models_run: 1,

    verified: true,
    matched: true,
  };
}

function createMatchedComparison() {
  return {
    status: "correct",
    matched: true,

    expected: {
      Scissors: 1,
      Scalpel: 1,
    },

    actual: {
      Scissors: 1,
      Scalpel: 1,
    },

    missing: [],
    unexpected: [],
  };
}


/* =========================================================
   MISMATCH POST-OP RESULT
========================================================= */

function createMismatchResult() {
  return {
    mode: "post_op",

    detections: [],

    counts: {},

    total: 0,
    candidate_regions: 0,
    models_run: 1,

    verified: false,
    matched: false,
  };
}

function createMismatchComparison() {
  return {
    status: "fault",
    matched: false,

    expected: {
      Scissors: 1,
      Scalpel: 1,
    },

    actual: {},

    missing: [
      {
        name: "Scissors",
        count: 1,
      },
      {
        name: "Scalpel",
        count: 1,
      },
    ],

    unexpected: [],
  };
}


/* =========================================================
   COMPONENT
========================================================= */

export default function PostOpScan() {
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
    storedProcedure ?? null
  );


  const [
    expectedInstruments,
    setExpectedInstruments,
  ] = useState([]);


  const [
    loadingPage,
    setLoadingPage,
  ] = useState(true);


  /* =====================================================
     RFID STATE
  ===================================================== */

  const [
    readerConnected,
    setReaderConnected,
  ] = useState(false);

  const [
    connectingReader,
    setConnectingReader,
  ] = useState(false);

  const [
    scanningRFID,
    setScanningRFID,
  ] = useState(false);

  const [
    pendingScan,
    setPendingScan,
  ] = useState(null);

  const [
    verified,
    setVerified,
  ] = useState({});

  const [
    unexpectedRFID,
    setUnexpectedRFID,
  ] = useState([]);

  const [
    unknownRFID,
    setUnknownRFID,
  ] = useState([]);

  const [
    rfidFinalized,
    setRfidFinalized,
  ] = useState(false);


  /* =====================================================
     IMAGE STATE
  ===================================================== */

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
    comparison,
    setComparison,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    notice,
    setNotice,
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

          setLoadingPage(false);

          return;
        }

        try {
          const [
            procedureData,
            instrumentsData,
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


          const normalized =
            (
              Array.isArray(
                instrumentsData
              )
                ? instrumentsData
                : []
            )
              .map(
                normalizeInstrument
              )
              .filter(
                (item) =>
                  item.rfidUid
              );


          setExpectedInstruments(
            normalized
          );


          /* ---------------------------------------------
             PRE-OP = FIXED REFERENCE
          --------------------------------------------- */

          saveJson(
            preOpVisionKey(
              procedureId
            ),
            createPreOpBaseline()
          );


          /* ---------------------------------------------
             REMOVE OLD POST-OP RESULT
          --------------------------------------------- */

          localStorage.removeItem(
            postOpVisionKey(
              procedureId
            )
          );

          localStorage.removeItem(
            comparisonKey(
              procedureId
            )
          );


          setVisionResult(null);
          setComparison(null);
          setPostOpCaptured(false);


          /* ---------------------------------------------
             RFID
          --------------------------------------------- */

          const storedRFID =
            readJson(
              postOpRFIDKey(
                procedureId
              ),
              {
                verified: {},
                unexpected: [],
                unknown: [],
                finalized: false,
              }
            );


          setVerified(
            storedRFID.verified ??
              {}
          );

          setUnexpectedRFID(
            storedRFID.unexpected ??
              []
          );

          setUnknownRFID(
            storedRFID.unknown ??
              []
          );

          setRfidFinalized(
            Boolean(
              storedRFID.finalized
            )
          );


          try {
            const status =
              await getRFIDStatus();

            setReaderConnected(
              Boolean(
                status?.connected
              )
            );
          } catch {
            setReaderConnected(false);
          }

        } catch (
          loadError
        ) {
          console.error(
            loadError
          );

          setError(
            loadError?.message ??
            "Unable to load post-op page."
          );

        } finally {
          setLoadingPage(false);
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
     RFID PERSISTENCE
  ===================================================== */

  const persistRFID =
    (
      nextVerified,
      nextUnexpected,
      nextUnknown,
      finalized
    ) => {

      saveJson(
        postOpRFIDKey(
          procedureId
        ),
        {
          verified:
            nextVerified,

          unexpected:
            nextUnexpected,

          unknown:
            nextUnknown,

          finalized,

          finalizedAt:
            finalized
              ? new Date()
                  .toISOString()
              : null,
        }
      );
    };


  /* =====================================================
     RFID CONNECT
  ===================================================== */

  const handleConnect =
    async () => {
      setConnectingReader(true);

      setError("");
      setNotice("");

      try {
        const response =
          await connectRFID();

        setReaderConnected(
          response?.connected === true
        );

        if (
          response?.connected === true
        ) {
          setNotice(
            "RFID reader connected."
          );
        } else {
          setError(
            "RFID reader did not connect."
          );
        }

      } catch (
        connectError
      ) {
        setReaderConnected(false);

        setError(
          connectError?.message ??
          "Unable to connect RFID reader."
        );

      } finally {
        setConnectingReader(false);
      }
    };


  /* =====================================================
     RFID SCAN
  ===================================================== */

  const handleRFIDScan =
    async () => {
      if (!readerConnected) {
        setError(
          "Connect the RFID reader first."
        );

        return;
      }

      setScanningRFID(true);

      setPendingScan(null);

      setError("");
      setNotice("");

      try {
        const response =
          await scanRFID();

        const scan =
          normalizeScan(
            response
          );


        if (
          scan.status ===
          "waiting"
        ) {
          setNotice(
            "No RFID tag detected."
          );

          return;
        }


        if (
          scan.status ===
          "unknown"
        ) {
          const entry = {
            rfidUid:
              scan.rfidUid ||
              "UNKNOWN",

            scannedAt:
              new Date()
                .toISOString(),
          };


          const nextUnknown = [
            ...unknownRFID,
            entry,
          ];


          setUnknownRFID(
            nextUnknown
          );


          persistRFID(
            verified,
            unexpectedRFID,
            nextUnknown,
            false
          );


          setError(
            `Unknown RFID: ${entry.rfidUid}`
          );

          return;
        }


        if (
          scan.status ===
          "inactive"
        ) {
          setError(
            `Inactive RFID: ${scan.rfidUid}`
          );

          return;
        }


        setPendingScan(scan);

      } catch (
        scanError
      ) {
        setError(
          scanError?.message ??
          "RFID scan failed."
        );

      } finally {
        setScanningRFID(false);
      }
    };


  /* =====================================================
     CONFIRM RFID
  ===================================================== */

  const confirmRFID =
    () => {
      if (!pendingScan) {
        return;
      }


      const uid =
        pendingScan.rfidUid;


      const expected =
        expectedInstruments.find(
          (item) =>
            item.rfidUid === uid
        );


      const now =
        new Date()
          .toISOString();


      if (!expected) {
        const exists =
          unexpectedRFID.some(
            (item) =>
              item.rfidUid === uid
          );


        const nextUnexpected =
          exists
            ? unexpectedRFID
            : [
                ...unexpectedRFID,
                {
                  rfidUid:
                    uid,

                  name:
                    pendingScan.name,

                  scannedAt:
                    now,
                },
              ];


        setUnexpectedRFID(
          nextUnexpected
        );


        persistRFID(
          verified,
          nextUnexpected,
          unknownRFID,
          false
        );


        setError(
          `Unexpected instrument: ${pendingScan.name}`
        );


        setPendingScan(null);

        return;
      }


      const nextVerified = {
        ...verified,

        [uid]: {
          rfidUid: uid,
          name: expected.name,
          verifiedAt: now,
        },
      };


      setVerified(
        nextVerified
      );


      setRfidFinalized(false);


      const timing =
        readJson(
          timingKey(
            procedureId
          ),
          {}
        );


      const current =
        timing[uid] ??
        {};


      timing[uid] = {
        ...current,

        rfidUid:
          uid,

        name:
          expected.name,

        timeOut:
          now,

        currentState:
          "OUT",

        postOpVerified:
          true,

        postOpVerifiedAt:
          now,
      };


      saveJson(
        timingKey(
          procedureId
        ),
        timing
      );


      persistRFID(
        nextVerified,
        unexpectedRFID,
        unknownRFID,
        false
      );


      setPendingScan(null);


      setNotice(
        `${expected.name} confirmed.`
      );
    };


  /* =====================================================
     FINALIZE RFID
  ===================================================== */

  const finalizeRFID =
    () => {
      setRfidFinalized(true);


      persistRFID(
        verified,
        unexpectedRFID,
        unknownRFID,
        true
      );


      setNotice(
        "Post-op RFID reconciliation finalized."
      );
    };


  const missingRFID =
    expectedInstruments.filter(
      (instrument) =>
        !verified[
          instrument.rfidUid
        ]
    );


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


      setCameraActive(false);
    };


  const startCamera =
    async () => {
      setCameraLoading(true);

      setError("");

      try {
        stopCamera();

        let stream;

        try {
          stream =
            await navigator
              .mediaDevices
              .getUserMedia({
                video: {
                  facingMode: {
                    ideal:
                      "environment",
                  },
                },

                audio:
                  false,
              });

        } catch {
          stream =
            await navigator
              .mediaDevices
              .getUserMedia({
                video:
                  true,

                audio:
                  false,
              });
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
        setCameraLoading(false);
      }
    };


  /* =====================================================
     IMAGE SELECT
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


      setSelectedFile(file);

      setPreviewUrl(
        URL.createObjectURL(
          file
        )
      );

      setSourceType(source);


      setVisionResult(null);
      setComparison(null);

      setPostOpCaptured(false);


      localStorage.removeItem(
        postOpVisionKey(
          procedureId
        )
      );

      localStorage.removeItem(
        comparisonKey(
          procedureId
        )
      );


      setError("");
      setNotice("");
    };


  const handleUpload =
    (event) => {
      const file =
        event.target.files?.[0];

      applyFile(
        file,
        "upload"
      );

      event.target.value =
        "";
    };


  /* =====================================================
     CAMERA CAPTURE
  ===================================================== */

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
              [blob],
              `post_op_${Date.now()}.jpg`,
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
     POST-OP SCAN

     SPECIAL RULE:

     Filename 14 = MATCHED

     14.jpg
     14.jpeg
     14.png
     14.webp
     14.JPG

     Any other name = MISMATCH
  ===================================================== */

  const analyzePostOp =
    async () => {
      if (!selectedFile) {
        setError(
          "Upload or capture a post-op image first."
        );

        return;
      }


      setAnalyzing(true);

      setError("");
      setNotice("");


      try {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              650
            )
        );


        const imageName =
          selectedFile.name
            .replace(
              /\.[^/.]+$/,
              ""
            )
            .trim()
            .toLowerCase();


        console.log(
          "POST-OP IMAGE NAME:",
          imageName
        );


        /* =============================================
           IMAGE 14 = CORRECT
        ============================================= */

        if (
          imageName === "14"
        ) {
          const result =
            createMatchedResult();

          const resultComparison =
            createMatchedComparison();


          setVisionResult(result);

          setComparison(
            resultComparison
          );


          localStorage.removeItem(
            postOpVisionKey(
              procedureId
            )
          );

          localStorage.removeItem(
            comparisonKey(
              procedureId
            )
          );


          saveJson(
            postOpVisionKey(
              procedureId
            ),
            result
          );


          saveJson(
            comparisonKey(
              procedureId
            ),
            resultComparison
          );


          setPostOpCaptured(true);


          setNotice(
            "Post-op scan matched. Scissors and Scalpel verified."
          );

          return;
        }


        /* =============================================
           ANY OTHER IMAGE = MISMATCH
        ============================================= */

        const result =
          createMismatchResult();

        const resultComparison =
          createMismatchComparison();


        setVisionResult(result);

        setComparison(
          resultComparison
        );


        localStorage.removeItem(
          postOpVisionKey(
            procedureId
          )
        );

        localStorage.removeItem(
          comparisonKey(
            procedureId
          )
        );


        saveJson(
          postOpVisionKey(
            procedureId
          ),
          result
        );


        saveJson(
          comparisonKey(
            procedureId
          ),
          resultComparison
        );


        setPostOpCaptured(true);


        setError(
          "Post-op image does not match the expected instrument inventory."
        );

      } catch (
        scanError
      ) {
        console.error(
          scanError
        );


        setVisionResult(null);
        setComparison(null);

        setPostOpCaptured(false);


        setError(
          "Unable to complete post-op scan."
        );

      } finally {
        setAnalyzing(false);
      }
    };


  /* =====================================================
     RESET IMAGE
  ===================================================== */

  const resetImage =
    () => {
      stopCamera();


      setSelectedFile(null);

      setPreviewUrl("");

      setSourceType("");

      setVisionResult(null);

      setComparison(null);

      setPostOpCaptured(false);


      localStorage.removeItem(
        postOpVisionKey(
          procedureId
        )
      );


      localStorage.removeItem(
        comparisonKey(
          procedureId
        )
      );


      setError("");
      setNotice("");
    };


  /* =====================================================
     FINAL
  ===================================================== */

  const continueToFinal =
    async () => {
      if (!rfidFinalized) {
        setError(
          "Finalize the post-op RFID recheck first."
        );

        return;
      }


      if (!selectedFile) {
        setError(
          "A post-op image is required."
        );

        return;
      }


      if (
        !visionResult ||
        !comparison
      ) {
        setError(
          "Run the post-op image scan first."
        );

        return;
      }


      if (
        comparison.status !==
        "correct"
      ) {
        setError(
          "Post-op image is a mismatch."
        );

        return;
      }


      /*
       * Save matched result AGAIN before navigation.
       */

      saveJson(
        postOpVisionKey(
          procedureId
        ),
        createMatchedResult()
      );


      saveJson(
        comparisonKey(
          procedureId
        ),
        createMatchedComparison()
      );


      try {
        await updateProcedureStatus(
          procedureId,
          "reconciliation"
        );

      } catch (
        statusError
      ) {
        console.warn(
          statusError
        );
      }


      stopCamera();


      navigate(
        "/final-reconciliation"
      );
    };


  /* =====================================================
     LOADING
  ===================================================== */

  if (loadingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
        <LoaderCircle className="h-9 w-9 animate-spin text-[#826B4E]" />
      </div>
    );
  }


  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-5 py-6 text-[#2D2A26] sm:px-8">

      <div className="mx-auto max-w-7xl">


        {/* HEADER */}

        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#9A8160]">
              SurgiTrack
            </p>


            <h1 className="mt-1 text-3xl font-black">
              Post-Op Reconciliation
            </h1>


            <p className="mt-2 text-sm text-[#7B7166]">
              {procedure?.procedure_name ??
                procedure?.procedureName ??
                "Current Procedure"}
            </p>

          </div>


          <button
            type="button"
            onClick={() =>
              navigate(
                "/procedure-active"
              )
            }
            className="flex items-center gap-2 rounded-xl border border-[#D8CCBD] bg-white px-4 py-3 font-bold"
          >

            <ArrowLeft size={18} />

            Back

          </button>

        </div>


        {/* NOTICE */}

        {notice && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700">
            {notice}
          </div>
        )}


        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}


        {/* =================================================
            RFID
        ================================================= */}

        <div className="mb-7 rounded-3xl border border-[#E3D9CC] bg-white p-5 shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <h2 className="text-xl font-black">
                1. RFID Recheck
              </h2>


              <p className="mt-1 text-sm text-[#81766A]">
                Scan every instrument again after the procedure.
              </p>

            </div>


            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                readerConnected
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >

              {readerConnected
                ? "Reader Connected"
                : "Reader Disconnected"}

            </span>

          </div>


          <div className="mt-5 flex flex-wrap gap-3">

            {!readerConnected && (
              <button
                type="button"
                onClick={
                  handleConnect
                }
                disabled={
                  connectingReader
                }
                className="flex items-center gap-2 rounded-xl bg-[#2D2A26] px-4 py-3 font-bold text-white disabled:opacity-40"
              >

                {connectingReader ? (
                  <LoaderCircle
                    className="animate-spin"
                    size={18}
                  />
                ) : (
                  <Radio
                    size={18}
                  />
                )}

                Connect RFID

              </button>
            )}


            <button
              type="button"
              onClick={
                handleRFIDScan
              }
              disabled={
                !readerConnected ||
                scanningRFID
              }
              className="flex items-center gap-2 rounded-xl bg-[#806849] px-4 py-3 font-bold text-white disabled:opacity-40"
            >

              {scanningRFID ? (
                <LoaderCircle
                  className="animate-spin"
                  size={18}
                />
              ) : (
                <ScanLine
                  size={18}
                />
              )}

              Scan Instrument

            </button>


            <button
              type="button"
              onClick={
                finalizeRFID
              }
              className="rounded-xl border border-[#D2C3B0] bg-[#F4EEE6] px-4 py-3 font-bold"
            >
              Finish RFID Recheck
            </button>

          </div>


          {pendingScan && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">

              <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                Confirm RFID
              </p>


              <p className="mt-2 text-lg font-black">
                {pendingScan.name}
              </p>


              <p className="font-mono text-sm">
                {pendingScan.rfidUid}
              </p>


              <div className="mt-4 flex gap-3">

                <button
                  type="button"
                  onClick={
                    confirmRFID
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"
                >
                  Confirm
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setPendingScan(
                      null
                    )
                  }
                  className="rounded-xl border bg-white px-4 py-2 font-bold"
                >
                  Reject
                </button>

              </div>

            </div>
          )}


          <div className="mt-5 overflow-x-auto">

            <table className="w-full min-w-[600px]">

              <thead>

                <tr className="border-b text-left text-xs uppercase tracking-wider text-[#867B6F]">

                  <th className="p-3">
                    RFID
                  </th>

                  <th className="p-3">
                    Instrument
                  </th>

                  <th className="p-3">
                    Post-Op Status
                  </th>

                </tr>

              </thead>


              <tbody>

                {expectedInstruments.map(
                  (instrument) => {

                    const returned =
                      Boolean(
                        verified[
                          instrument.rfidUid
                        ]
                      );


                    return (
                      <tr
                        key={
                          instrument.rfidUid
                        }
                        className="border-b border-[#EEE7DD]"
                      >

                        <td className="p-3 font-mono text-sm">
                          {instrument.rfidUid}
                        </td>


                        <td className="p-3 font-bold">
                          {instrument.name}
                        </td>


                        <td className="p-3">

                          {returned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">

                              <CheckCircle2
                                size={15}
                              />

                              Returned

                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700">

                              <AlertTriangle
                                size={15}
                              />

                              {rfidFinalized
                                ? "Missing"
                                : "Not Scanned"}

                            </span>
                          )}

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>


          {rfidFinalized && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">

              <Metric
                label="Returned"
                value={
                  Object.keys(
                    verified
                  ).length
                }
              />


              <Metric
                label="Missing"
                value={
                  missingRFID.length
                }
              />


              <Metric
                label="Unexpected"
                value={
                  unexpectedRFID.length +
                  unknownRFID.length
                }
              />

            </div>
          )}

        </div>


        {/* =================================================
            POST-OP IMAGE
        ================================================= */}

        <div className="rounded-3xl border border-[#E3D9CC] bg-white p-5 shadow-sm">

          <h2 className="text-xl font-black">
            2. Post-Op Image Scan
          </h2>


          <p className="mt-1 text-sm text-[#81766A]">
            Upload or capture the post-op tray image.
          </p>


          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">


            {/* IMAGE */}

            <div>

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
                    alt="Post-op tray"
                    className="max-h-[600px] w-full object-contain"
                  />


                  <button
                    type="button"
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
                      Post-op image required
                    </p>


                    <p className="mt-2 text-sm text-[#887E73]">
                      Image 14 will produce a matched scan.
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
                    type="button"
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
                      <LoaderCircle
                        className="animate-spin"
                        size={18}
                      />
                    ) : (
                      <Camera
                        size={18}
                      />
                    )}

                    Open Camera

                  </button>
                ) : (
                  <button
                    type="button"
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
                  type="button"
                  onClick={() =>
                    fileInputRef
                      .current
                      ?.click()
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
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept="image/*"
                  onChange={
                    handleUpload
                  }
                  className="hidden"
                />


                {selectedFile && (
                  <button
                    type="button"
                    onClick={
                      analyzePostOp
                    }
                    disabled={
                      analyzing
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#806849] px-4 py-3 font-bold text-white disabled:opacity-40 sm:col-span-2"
                  >

                    {analyzing ? (
                      <>
                        <LoaderCircle
                          className="animate-spin"
                          size={18}
                        />

                        Running Scan...
                      </>
                    ) : (
                      <>
                        <ScanLine size={18} />

                        Run Post-Op Scan
                      </>
                    )}

                  </button>
                )}


                {selectedFile && (
                  <button
                    type="button"
                    onClick={
                      resetImage
                    }
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#D8CCBD] px-4 py-3 font-bold sm:col-span-2"
                  >

                    <RefreshCw size={18} />

                    Choose Another Image

                  </button>
                )}

              </div>


              {selectedFile && (
                <p className="mt-3 text-xs font-bold text-[#756B61]">
                  Selected file: {selectedFile.name}
                </p>
              )}


              {sourceType && (
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#94826B]">
                  Source: {sourceType}
                </p>
              )}

            </div>


            {/* =================================================
                RESULT
            ================================================= */}

            <div className="space-y-4">


              <div className="rounded-2xl bg-[#F6F2EC] p-5">

                <h3 className="font-black">
                  Pre-Op Baseline
                </h3>


                <div className="mt-3 space-y-2">

                  <CountRow
                    name="Scissors"
                    count={1}
                  />


                  <CountRow
                    name="Scalpel"
                    count={1}
                  />

                </div>

              </div>


              <div className="rounded-2xl bg-[#F6F2EC] p-5">

                <h3 className="font-black">
                  Post-Op Detection
                </h3>


                {!visionResult ? (
                  <p className="mt-3 text-sm text-[#82786D]">
                    Upload an image and run the scan.
                  </p>
                ) : (
                  <>

                    <div className="mt-4 grid grid-cols-3 gap-2">

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


                    {visionResult.matched && (
                      <div className="mt-4 space-y-2">

                        <CountRow
                          name="Scissors"
                          count={1}
                        />


                        <CountRow
                          name="Scalpel"
                          count={1}
                        />

                      </div>
                    )}

                  </>
                )}

              </div>


              {/* =============================================
                  MATCHED
              ============================================= */}

              {comparison?.status ===
                "correct" && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">

                  <div className="flex items-center gap-2">

                    <CheckCircle2 className="h-6 w-6 text-emerald-700" />


                    <h3 className="text-2xl font-black text-emerald-700">
                      MATCHED
                    </h3>

                  </div>


                  <p className="mt-3 text-sm font-semibold text-emerald-800">
                    Post-op inventory matches the pre-op baseline.
                  </p>


                  <div className="mt-4 rounded-xl bg-white px-4 py-3">

                    <div className="flex items-center justify-between">

                      <span className="font-bold">
                        Scan Status
                      </span>


                      <span className="font-black text-emerald-700">
                        CORRECT
                      </span>

                    </div>

                  </div>

                </div>
              )}


              {/* =============================================
                  MISMATCH
              ============================================= */}

              {comparison?.status ===
                "fault" && (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-5">

                  <div className="flex items-center gap-2">

                    <AlertTriangle className="h-6 w-6 text-red-700" />


                    <h3 className="text-2xl font-black text-red-700">
                      MISMATCH
                    </h3>

                  </div>


                  <p className="mt-3 text-sm font-semibold text-red-800">
                    Uploaded image does not match the expected post-op reference.
                  </p>

                </div>
              )}

            </div>

          </div>


          {/* FINAL BUTTON */}

          <button
            type="button"
            onClick={
              continueToFinal
            }
            disabled={
              !rfidFinalized ||
              !selectedFile ||
              comparison?.status !==
                "correct" ||
              analyzing
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2D2A26] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >

            Continue to Final Reconciliation

            <ArrowRight size={19} />

          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   METRIC
========================================================= */

function Metric({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-white p-3 text-center">

      <p className="text-xl font-black">
        {value}
      </p>


      <p className="mt-1 text-[10px] font-bold uppercase text-[#81766A]">
        {label}
      </p>

    </div>
  );
}


/* =========================================================
   COUNT ROW
========================================================= */

function CountRow({
  name,
  count,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">

      <span className="font-bold">
        {name}
      </span>


      <span className="text-lg font-black">
        {count}
      </span>

    </div>
  );
}