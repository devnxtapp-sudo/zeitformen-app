<script>
  import { auth, updateName, changePassword, deleteAccount } from "../auth.svelte.js";

  let { onback } = $props();

  let name = $state(auth.user?.name ?? "");
  let nameBusy = $state(false);
  let nameMsg = $state("");

  let hasPassword = $derived(!!auth.user?.hasPassword);
  let currentPw = $state("");
  let newPw = $state("");
  let newPw2 = $state("");
  let pwBusy = $state(false);
  let pwMsg = $state("");
  let pwError = $state(false);

  async function saveName() {
    const n = name.trim();
    if (!n || n === auth.user?.name) return;
    nameBusy = true;
    nameMsg = "";
    try {
      await updateName(n);
      nameMsg = "Gespeichert.";
    } catch (e) {
      nameMsg = e.message || "Konnte nicht gespeichert werden.";
    } finally {
      nameBusy = false;
    }
  }

  async function savePassword() {
    pwMsg = "";
    pwError = false;
    if (newPw.length < 8) {
      pwError = true;
      pwMsg = "Neues Passwort muss mindestens 8 Zeichen haben.";
      return;
    }
    if (newPw !== newPw2) {
      pwError = true;
      pwMsg = "Die Passwörter stimmen nicht überein.";
      return;
    }
    pwBusy = true;
    try {
      await changePassword(hasPassword ? currentPw : "", newPw);
      pwMsg = hasPassword ? "Passwort geändert." : "Passwort festgelegt.";
      currentPw = "";
      newPw = "";
      newPw2 = "";
    } catch (e) {
      pwError = true;
      pwMsg = e.message || "Passwort konnte nicht geändert werden.";
    } finally {
      pwBusy = false;
    }
  }

  let delConfirm = $state(false);
  let delBusy = $state(false);
  let delMsg = $state("");

  async function removeAccount() {
    delBusy = true;
    delMsg = "";
    try {
      await deleteAccount(); // reloads the app on success
    } catch (e) {
      delMsg = e.message || "Konto konnte nicht gelöscht werden.";
      delBusy = false;
    }
  }
</script>

<div class="account">
  <div class="head">
    <button class="back-btn" onclick={() => onback?.()} aria-label="Zurück">‹</button>
    <h2>Konto</h2>
  </div>

  <section class="panel">
    <h3>Benutzername</h3>
    <div class="field">
      <label for="ac-name">Anzeigename</label>
      <input id="ac-name" bind:value={name} maxlength="80" autocomplete="name" />
    </div>
    <div class="row">
      {#if nameMsg}<span class="msg">{nameMsg}</span>{/if}
      <button
        class="btn btn-primary btn-sm save"
        onclick={saveName}
        disabled={nameBusy || !name.trim() || name.trim() === auth.user?.name}
      >
        {nameBusy ? "Speichern …" : "Speichern"}
      </button>
    </div>
  </section>

  <section class="panel">
    <h3>E-Mail</h3>
    <div class="field">
      <label for="ac-email">E-Mail-Adresse</label>
      <input id="ac-email" value={auth.user?.email ?? ""} readonly />
    </div>
    <p class="hint muted">Die E-Mail-Adresse kann nicht geändert werden.</p>
  </section>

  <section class="panel">
    <h3>{hasPassword ? "Passwort ändern" : "Passwort festlegen"}</h3>
    {#if !hasPassword}
      <p class="hint muted">
        Du bist mit Google angemeldet. Lege optional ein Passwort fest, um dich
        zusätzlich mit E-Mail und Passwort anmelden zu können.
      </p>
    {/if}
    {#if hasPassword}
      <div class="field">
        <label for="ac-cur">Aktuelles Passwort</label>
        <input
          id="ac-cur"
          type="password"
          bind:value={currentPw}
          autocomplete="current-password"
        />
      </div>
    {/if}
    <div class="field">
      <label for="ac-new">Neues Passwort</label>
      <input
        id="ac-new"
        type="password"
        bind:value={newPw}
        autocomplete="new-password"
        placeholder="mindestens 8 Zeichen"
      />
    </div>
    <div class="field">
      <label for="ac-new2">Neues Passwort wiederholen</label>
      <input
        id="ac-new2"
        type="password"
        bind:value={newPw2}
        autocomplete="new-password"
      />
    </div>
    <div class="row">
      {#if pwMsg}<span class="msg" class:error={pwError}>{pwMsg}</span>{/if}
      <button
        class="btn btn-primary btn-sm save"
        onclick={savePassword}
        disabled={pwBusy || !newPw || !newPw2 || (hasPassword && !currentPw)}
      >
        {pwBusy ? "Speichern …" : hasPassword ? "Passwort ändern" : "Passwort festlegen"}
      </button>
    </div>
  </section>

  <section class="panel danger">
    <h3>Konto löschen</h3>
    <p class="hint muted">
      Dein Konto und alle gespeicherten Trainingsdaten werden unwiderruflich
      gelöscht. Dies kann nicht rückgängig gemacht werden.
    </p>
    {#if !delConfirm}
      <div class="row">
        <button class="btn btn-sm danger-btn" onclick={() => (delConfirm = true)}>
          Konto löschen
        </button>
      </div>
    {:else}
      <p class="confirm-text">Möchtest du dein Konto wirklich endgültig löschen?</p>
      {#if delMsg}<span class="msg error">{delMsg}</span>{/if}
      <div class="row">
        <button class="btn btn-sm" onclick={() => (delConfirm = false)} disabled={delBusy}>
          Abbrechen
        </button>
        <button class="btn btn-sm danger-btn" onclick={removeAccount} disabled={delBusy}>
          {delBusy ? "Löschen …" : "Endgültig löschen"}
        </button>
      </div>
    {/if}
  </section>
</div>

<style>
  .account {
    margin-bottom: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }
  .head h2 {
    font-size: 20px;
  }
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
  }
  .panel h3 {
    font-size: 15px;
    margin-bottom: 14px;
  }
  .field label {
    text-transform: none;
    letter-spacing: 0;
  }
  input[readonly] {
    color: var(--text-muted);
  }
  .hint {
    font-size: 13px;
    margin: 0;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 4px;
  }
  .save {
    flex: 0 0 auto;
  }
  .msg {
    font-size: 13px;
    color: var(--c-zone2, #5fb87a);
  }
  .msg.error {
    color: var(--c-danger, #e5534b);
  }
  .panel.danger {
    border-color: rgba(229, 83, 75, 0.4);
  }
  .panel.danger h3 {
    color: var(--c-danger, #e5534b);
  }
  .confirm-text {
    font-size: 13.5px;
    color: var(--text);
    margin: 0 0 10px;
  }
  .danger-btn {
    flex: 0 0 auto;
    background: var(--c-danger, #e5534b);
    color: #fff;
    border: none;
  }
  .danger-btn:hover {
    filter: brightness(1.08);
  }
</style>
