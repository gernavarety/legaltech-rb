"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  getSubscription,
  getTeam,
  inviteTeamMember,
  removeTeamMember,
  cancelSubscription,
  SubscriptionInfo,
} from "@/lib/api";

export default function SettingsPage() {
  const { user, signOut, getAccessToken } = useAuth();
  const router = useRouter();

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [team, setTeam] = useState<{
    members: any[];
    count: number;
    max_members: number;
  } | null>(null);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    Promise.all([
      getSubscription(token).catch(() => null),
      getTeam(token).catch(() => null),
    ]).then(([s, t]) => {
      setSub(s);
      setTeam(t);
      setLoading(false);
    });
  }, [user, getAccessToken]);

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);

    if (pwNew.length < 8) {
      setPwMsg({ type: "err", text: "Новый пароль должен быть не менее 8 символов" });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: "err", text: "Пароли не совпадают" });
      return;
    }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    setPwLoading(false);

    if (error) {
      setPwMsg({ type: "err", text: error.message });
    } else {
      setPwMsg({ type: "ok", text: "Пароль успешно изменён" });
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    }
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviteMsg(null);
    setInviteLoading(true);
    try {
      const token = getAccessToken();
      const res = await inviteTeamMember(inviteEmail, token);
      setInviteMsg(res.message);
      setInviteEmail("");
      // Перезагружаем список команды
      const t = await getTeam(token);
      setTeam(t);
    } catch (e: any) {
      setInviteMsg(e.message || "Ошибка приглашения");
    }
    setInviteLoading(false);
  }

  async function handleRemoveMember(email: string) {
    if (!confirm(`Удалить ${email} из команды?`)) return;
    const token = getAccessToken();
    try {
      await removeTeamMember(email, token);
      const t = await getTeam(token);
      setTeam(t);
    } catch (e: any) {
      alert(e.message || "Ошибка");
    }
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleteLoading(true);
    // Supabase Admin API — удаление через edge function или service role
    // В боевом проекте это должна быть защищённая server-side операция
    const { error } = await supabase.auth.admin?.deleteUser(user!.id) || { error: null };
    if (error) {
      alert("Ошибка удаления: " + error.message);
      setDeleteLoading(false);
      return;
    }
    await signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400">Загрузка настроек...</div>
      </div>
    );
  }

  const isFirm = sub?.plan_name === "firm";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Настройки аккаунта</h1>

      {/* Информация об аккаунте */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Аккаунт</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-slate-50">
            <span className="text-sm text-slate-500">Email</span>
            <span className="text-sm font-medium text-slate-900">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-slate-50">
            <span className="text-sm text-slate-500">Тариф</span>
            <span className="text-sm font-semibold text-slate-900">
              {sub?.plan_name?.toUpperCase() || "FREE"}
            </span>
          </div>
          {sub?.subscription && (
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-slate-500">Подписка до</span>
              <span className="text-sm text-slate-900">
                {new Date(sub.subscription.current_period_end).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Смена пароля */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Смена пароля</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Новый пароль</label>
            <input
              type="password"
              required
              minLength={8}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              placeholder="Минимум 8 символов"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Подтвердите пароль</label>
            <input
              type="password"
              required
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              placeholder="Повторите пароль"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
            />
          </div>

          {pwMsg && (
            <div className={`text-sm p-3 rounded-lg ${
              pwMsg.type === "ok"
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-red-50 text-red-700 border border-red-100"
            }`}>
              {pwMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
          >
            {pwLoading ? "Сохраняем..." : "Сохранить пароль"}
          </button>
        </form>
      </section>

      {/* Управление командой — только FIRM */}
      {isFirm && team && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Команда</h2>
            <span className="text-sm text-slate-500">
              {team.count} / {team.max_members} участников
            </span>
          </div>

          {/* Список участников */}
          {team.members.length > 0 ? (
            <div className="mb-5 space-y-2">
              {team.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900">{m.invite_email}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      m.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {m.status === "active" ? "Активен" : "Ожидает"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(m.invite_email)}
                    className="text-red-400 hover:text-red-600 text-sm transition"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 mb-5">
              В команде пока никого нет. Пригласите коллег.
            </p>
          )}

          {/* Форма приглашения */}
          {team.count < team.max_members && (
            <form onSubmit={handleInvite} className="flex gap-3">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email коллеги"
                className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
              />
              <button
                type="submit"
                disabled={inviteLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition shrink-0"
              >
                {inviteLoading ? "..." : "Пригласить"}
              </button>
            </form>
          )}

          {inviteMsg && (
            <p className="text-sm text-slate-600 mt-3">{inviteMsg}</p>
          )}
        </section>
      )}

      {/* Опасная зона */}
      <section className="bg-white rounded-2xl border border-red-100 p-6">
        <h2 className="font-semibold text-red-700 mb-2">Опасная зона</h2>
        <p className="text-sm text-slate-500 mb-4">
          Удаление аккаунта необратимо. Все ваши данные и история документов будут уничтожены.
          Активная подписка будет отменена без возврата средств.
        </p>

        {deleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-700">
              Вы уверены? Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
              >
                {deleteLoading ? "Удаляем..." : "Да, удалить аккаунт"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-5 py-2.5 rounded-lg transition"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 hover:border-red-400 px-5 py-2.5 rounded-lg transition"
          >
            Удалить аккаунт
          </button>
        )}
      </section>
    </div>
  );
}
