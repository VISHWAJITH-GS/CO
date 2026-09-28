import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, LogOut, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { getProfile, updatePassword } from "../lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function Settings({ user }) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(user?.email || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [messageType, setMessageType] = useState("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (passwordMessage) {
      const timer = setTimeout(() => setPasswordMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordMessage]);

  useEffect(() => {
    async function fetchEmail() {
      if (!user?.email) return;
      try {
        const profile = await getProfile(user.email);
        setUserEmail(profile.email);
      } catch {
        setUserEmail(user.email);
      }
    }
    fetchEmail();
  }, [user?.email]);

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessageType("error");
      setPasswordMessage("Please fill all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setMessageType("error");
      setPasswordMessage("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessageType("error");
      setPasswordMessage("New password and confirm password do not match.");
      return;
    }

    setSaving(true);
    try {
      const data = await updatePassword({
        email: userEmail,
        currentPassword,
        newPassword,
      });
      setMessageType("success");
      setPasswordMessage(data.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessageType("error");
      setPasswordMessage(error.message || "Password update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage password and security.</p>
        </motion.div>

        {/* Change Password Card */}
        <motion.div variants={itemVariants}>
          <Card className="border-slate-100 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-slate-100/60 bg-slate-50/50 pb-6 pt-6">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900 font-semibold">
                <div className="p-2 rounded-lg bg-red-950/10 text-red-950 border border-red-950/20">
                  <LockKeyhole size={18} />
                </div>
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form className="space-y-5" onSubmit={handlePasswordUpdate}>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-white transition-all focus-visible:ring-red-500/20 shadow-sm h-10"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-500">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="bg-white transition-all focus-visible:ring-red-500/20 shadow-sm h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="bg-white transition-all focus-visible:ring-red-500/20 shadow-sm h-10"
                    />
                  </div>
                </div>

                <AnimatePresence mode="popLayout">
                  {passwordMessage && (
                    <motion.div
                      key={passwordMessage}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border shadow-sm ${
                        messageType === "success" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-red-50 text-red-700 border-red-100"
                      }`}
                    >
                      {messageType === "success" ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600" />
                      )}
                      {passwordMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="btn-press shadow-sm group h-10 px-6 w-full sm:w-auto"
                  >
                    <AnimatePresence mode="wait">
                      {saving ? (
                        <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          Updating...
                        </motion.span>
                      ) : (
                        <motion.span key="update" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          Update Password
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Actions Card */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-slate-200/70 bg-white shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
            <CardContent className="grid items-center gap-4 p-6 pt-6 md:p-6 md:pt-6 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 space-y-1">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <LogOut size={16} className="text-red-950" />
                  Sign Out
                </h3>
                <p className="text-sm text-slate-500">
                  End your current session securely.
                </p>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full self-center sm:w-auto sm:justify-self-end">
                <Button
                  variant="outline"
                  className="btn-press h-10 w-full border-red-950/20 bg-white text-red-950 shadow-sm hover:border-red-950/30 hover:bg-red-950/10 hover:text-red-950 sm:w-auto"
                  onClick={() => navigate("/login")}
                >
                  Log out
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}
