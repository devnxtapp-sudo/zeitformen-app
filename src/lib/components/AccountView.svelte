<script>
  import { auth, updateName, changePassword, deleteAccount } from "../auth.svelte.js";
  import { Button, Input, Label, Helper } from "flowbite-svelte";

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

<div class="mb-[22px] flex flex-col gap-4">
  <div class="subpage-head">
    <h2>Konto</h2>
  </div>

  <section class="rounded-xl border border-line bg-card p-[18px]">
    <h3 class="mb-3.5 text-lg font-semibold">Benutzername</h3>
    <div class="mb-3.5">
      <Label for="ac-name" class="mb-1.5 block text-xs font-semibold text-ink-muted">Anzeigename</Label>
      <Input id="ac-name" bind:value={name} maxlength="80" autocomplete="name" />
    </div>
    <div class="mt-1 flex items-center justify-end gap-3">
      {#if nameMsg}<span class="text-sm text-zone2">{nameMsg}</span>{/if}
      <Button
        color="primary"
        size="sm"
        class="shrink-0 font-semibold text-[var(--on-accent)]"
        onclick={saveName}
        disabled={nameBusy || !name.trim() || name.trim() === auth.user?.name}
      >
        {nameBusy ? "Speichern …" : "Speichern"}
      </Button>
    </div>
  </section>

  <section class="rounded-xl border border-line bg-card p-[18px]">
    <h3 class="mb-3.5 text-lg font-semibold">E-Mail</h3>
    <div class="mb-3.5">
      <Label for="ac-email" class="mb-1.5 block text-xs font-semibold text-ink-muted">E-Mail-Adresse</Label>
      <Input id="ac-email" value={auth.user?.email ?? ""} readonly class="text-ink-muted" />
    </div>
    <p class="m-0 text-sm text-ink-muted">Die E-Mail-Adresse kann nicht geändert werden.</p>
  </section>

  <section class="rounded-xl border border-line bg-card p-[18px]">
    <h3 class="mb-3.5 text-lg font-semibold">{hasPassword ? "Passwort ändern" : "Passwort festlegen"}</h3>
    {#if !hasPassword}
      <p class="m-0 mb-3.5 text-sm text-ink-muted">
        Du bist mit Google angemeldet. Lege optional ein Passwort fest, um dich
        zusätzlich mit E-Mail und Passwort anmelden zu können.
      </p>
    {/if}
    {#if hasPassword}
      <div class="mb-3.5">
        <Label for="ac-cur" class="mb-1.5 block text-xs font-semibold text-ink-muted">Aktuelles Passwort</Label>
        <Input
          id="ac-cur"
          type="password"
          bind:value={currentPw}
          autocomplete="current-password"
        />
      </div>
    {/if}
    <div class="mb-3.5">
      <Label for="ac-new" class="mb-1.5 block text-xs font-semibold text-ink-muted">Neues Passwort</Label>
      <Input
        id="ac-new"
        type="password"
        bind:value={newPw}
        autocomplete="new-password"
        placeholder="mindestens 8 Zeichen"
      />
    </div>
    <div class="mb-3.5">
      <Label for="ac-new2" class="mb-1.5 block text-xs font-semibold text-ink-muted">Neues Passwort wiederholen</Label>
      <Input
        id="ac-new2"
        type="password"
        bind:value={newPw2}
        autocomplete="new-password"
      />
    </div>
    <div class="mt-1 flex items-center justify-end gap-3">
      {#if pwMsg}<span class="text-sm {pwError ? 'text-rest' : 'text-zone2'}">{pwMsg}</span>{/if}
      <Button
        color="primary"
        size="sm"
        class="shrink-0 font-semibold text-[var(--on-accent)]"
        onclick={savePassword}
        disabled={pwBusy || !newPw || !newPw2 || (hasPassword && !currentPw)}
      >
        {pwBusy ? "Speichern …" : hasPassword ? "Passwort ändern" : "Passwort festlegen"}
      </Button>
    </div>
  </section>

  <section class="rounded-xl border border-rest/40 bg-card p-[18px]">
    <h3 class="mb-3.5 text-lg font-semibold text-rest">Konto löschen</h3>
    <p class="m-0 text-sm text-ink-muted">
      Dein Konto und alle gespeicherten Trainingsdaten werden unwiderruflich
      gelöscht. Dies kann nicht rückgängig gemacht werden.
    </p>
    {#if !delConfirm}
      <div class="mt-1 flex items-center justify-end gap-3">
        <Button color="red" size="sm" class="shrink-0" onclick={() => (delConfirm = true)}>
          Konto löschen
        </Button>
      </div>
    {:else}
      <p class="m-0 mb-2.5 mt-3.5 text-sm text-ink">Möchtest du dein Konto wirklich endgültig löschen?</p>
      {#if delMsg}<Helper class="mb-2.5" color="red">{delMsg}</Helper>{/if}
      <div class="mt-1 flex items-center justify-end gap-3">
        <Button color="alternative" size="sm" onclick={() => (delConfirm = false)} disabled={delBusy}>
          Abbrechen
        </Button>
        <Button color="red" size="sm" class="shrink-0" onclick={removeAccount} disabled={delBusy}>
          {delBusy ? "Löschen …" : "Endgültig löschen"}
        </Button>
      </div>
    {/if}
  </section>
</div>
