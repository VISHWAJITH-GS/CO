import { ChevronDown, SlidersHorizontal, CheckCircle2, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { collapsibleVariants, cardVariants } from "../../lib/animations";

const CO_LABELS = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"];

const EMPTY_VALUES = {
  ep: "",
  constraint: "",
  ela: {
    CO1: "",
    CO2: "",
    CO3: "",
    CO4: "",
    CO5: "",
    CO6: "",
  },
};

export default function ParameterSection({
  isOpen,
  completed,
  onComplete,
  onToggle,
  initialValues,
  onGenerateFinal,
  canGenerateFinal,
  isGeneratingFinal,
  hideGenerateButton,
}) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!initialValues || Object.keys(initialValues).length === 0) {
      return;
    }

    setValues({
      ep: initialValues.ep || "",
      constraint: initialValues.constraint || "",
      ela: {
        CO1: initialValues?.ela?.CO1 || "",
        CO2: initialValues?.ela?.CO2 || "",
        CO3: initialValues?.ela?.CO3 || "",
        CO4: initialValues?.ela?.CO4 || "",
        CO5: initialValues?.ela?.CO5 || "",
        CO6: initialValues?.ela?.CO6 || "",
      },
    });
  }, [initialValues]);

  const isValid =
    values.ep.trim() !== "" &&
    values.constraint.trim() !== "" &&
    CO_LABELS.every((co) => values.ela[co]?.trim() !== "");

  const handleContinue = () => {
    setTouched(true);
    if (isValid) {
      onComplete?.(values);
    }
  };

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-red-100/80 shadow-[0_16px_35px_-32px_rgba(15,23,42,0.65)] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-red-950">
              <SlidersHorizontal size={18} />
              CO Attainment Parameter Section
              <AnimatePresence>
                {completed && (
                  <motion.span
                    className="ml-2 flex items-center gap-1 text-xs text-red-700"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: "spring", stiffness: 280, damping: 20 }}
                  >
                    <CheckCircle2 size={13} className="text-red-700" />
                    Completed
                  </motion.span>
                )}
              </AnimatePresence>
            </CardTitle>
            <button
              type="button"
              className="h-8 w-8 p-0 rounded-md inline-flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-900 transition-colors focus-visible:ring-2 focus-visible:ring-red-400/40 outline-none"
              onClick={onToggle}
              aria-label="Toggle parameter section"
            >
              <ChevronDown
                size={16}
                className={`section-chevron ${isOpen ? "open" : ""}`}
              />
            </button>
          </div>
        </CardHeader>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="param-content"
              variants={collapsibleVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <label
                      htmlFor="ep-value"
                      className="text-sm font-medium text-slate-700"
                    >
                      EP Value
                    </label>
                    <Input
                      id="ep-value"
                      placeholder="Enter EP Value"
                      value={values.ep}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          ep: e.target.value,
                        }))
                      }
                      className={`input-focus-motion ${
                        touched && !values.ep.trim() ? "border-red-400 focus-visible:ring-red-400/30" : ""
                      }`}
                    />
                    {touched && !values.ep.trim() && (
                      <motion.p
                        className="text-xs text-red-600"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        EP value is required
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label
                      htmlFor="constraint-value"
                      className="text-sm font-medium text-slate-700"
                    >
                      Constraint Value
                    </label>
                    <Input
                      id="constraint-value"
                      placeholder="Enter Constraint Value"
                      value={values.constraint}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          constraint: e.target.value,
                        }))
                      }
                      className={`input-focus-motion ${
                        touched && !values.constraint.trim()
                          ? "border-red-400 focus-visible:ring-red-400/30"
                          : ""
                      }`}
                    />
                    {touched && !values.constraint.trim() && (
                      <motion.p
                        className="text-xs text-red-600"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        Constraint value is required
                      </motion.p>
                    )}
                  </motion.div>
                </div>

                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <p className="text-sm font-medium text-slate-700">
                    ELA Values (CO1 to CO6)
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {CO_LABELS.map((co, idx) => (
                      <motion.div
                        key={co}
                        className="space-y-1.5"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 + idx * 0.04 }}
                      >
                        <label
                          htmlFor={`ela-${co}`}
                          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {co}
                        </label>
                        <Input
                          id={`ela-${co}`}
                          placeholder="ELA"
                          value={values.ela[co]}
                          onChange={(e) =>
                            setValues((prev) => ({
                              ...prev,
                              ela: {
                                ...prev.ela,
                                [co]: e.target.value,
                              },
                            }))
                          }
                          className={`input-focus-motion ${
                            touched && !values.ela[co]?.trim()
                              ? "border-red-400 focus-visible:ring-red-400/30"
                              : ""
                          }`}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {touched && !isValid && (
                    <motion.p
                      className="text-xs text-red-600"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      Please fill all ELA values for CO1 to CO6.
                    </motion.p>
                  )}
                </motion.div>



                {!hideGenerateButton && (
                  <div className="pt-2 pb-3">
                    <button
                      type="button"
                      className="btn-press inline-flex items-center gap-2 rounded-md bg-red-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
                      onClick={() => onGenerateFinal?.(values)}
                      disabled={!completed || !isValid || !canGenerateFinal || isGeneratingFinal}
                    >
                      {isGeneratingFinal ? "Generating..." : "Generate End-sem Report"}
                    </button>
                  </div>
                )}

                {hideGenerateButton && (
                  <div className="pt-2 pb-3">
                    <button
                      type="button"
                      className="btn-press inline-flex items-center gap-2 rounded-md bg-red-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
                      onClick={handleContinue}
                      disabled={!isValid}
                    >
                      Save Parameters
                    </button>
                  </div>
                )}

              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
