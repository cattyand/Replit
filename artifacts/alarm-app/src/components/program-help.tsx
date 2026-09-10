import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

export type HelpScreen = "home" | "alarmEdit" | "profilesList" | "profileEdit" | "settings" | "alarmActive";

type HelpEntry = { label: string; description: string };
type HelpScreenContent = { title: string; description: string; entries: HelpEntry[] };
type HelpCatalog = Record<HelpScreen, HelpScreenContent>;

const HELP_STORAGE_PREFIX = "alarm_manager_help_";
export const HELP_CATALOG_VERSION = "1";

const HELP_CATALOG: Record<SupportedLanguage, HelpCatalog> = {
  it: {
    home: {
      title: "Help — Sveglie",
      description: "Gestisci, ordina, cerca e attiva le tue sveglie.",
      entries: [
        { label: "Ordinamento", description: "Sceglie se mostrare le sveglie per prossima attivazione, per nome o per orario personale." },
        { label: "Cerca", description: "Apre la ricerca. Inserisci il nome, poi conferma con la spunta o con Invio; la X ripristina l’elenco completo." },
        { label: "Interruttore della sveglia", description: "Attiva o disattiva la sveglia senza modificarne le altre impostazioni." },
        { label: "Menu della sveglia", description: "Apre le azioni per modificare, clonare, simulare il suono, saltare la prossima occorrenza o eliminare la sveglia." },
        { label: "Nuova sveglia (+)", description: "Apre la maschera per creare una nuova sveglia, già precompilata con il profilo di default quando disponibile." },
      ],
    },
    alarmEdit: {
      title: "Help — Sveglia",
      description: "Configura una nuova sveglia o modifica una sveglia esistente.",
      entries: [
        { label: "Orario personale", description: "Seleziona uno degli orari definiti nelle impostazioni; l’ora e i minuti vengono compilati automaticamente." },
        { label: "Profilo", description: "Associa la sveglia a un profilo. I valori presenti nel profilo vengono ereditati e mostrati in arancione; scegli Nessun profilo per renderli modificabili." },
        { label: "Etichetta", description: "Nome descrittivo della sveglia, usato anche per la ricerca." },
        { label: "Icona della sveglia", description: "Sceglie l’icona visualizzata nella scheda della sveglia." },
        { label: "Ripetizione", description: "Imposta una sveglia una tantum, settimanale o su date specifiche." },
        { label: "Giorni della settimana", description: "Per una sveglia settimanale indica i giorni in cui deve suonare." },
        { label: "Date specifiche", description: "Per una sveglia su date specifiche indica uno o più giorni del calendario." },
        { label: "Data di attivazione", description: "Per una sveglia una tantum indica la data in cui deve suonare." },
        { label: "Cancellazione automatica", description: "Se attiva, elimina la sveglia dopo la sua attivazione." },
        { label: "Suoneria", description: "Sceglie il suono riprodotto quando la sveglia si attiva." },
        { label: "Volume", description: "Regola il volume della suoneria da 0 a 100 percento." },
        { label: "Volume incrementale", description: "Fa aumentare gradualmente il volume durante il numero di secondi scelto." },
        { label: "Vibrazione", description: "Disattiva la vibrazione, la attiva insieme al suono oppure usa la sola vibrazione." },
        { label: "Posticipo automatico", description: "Posticipa automaticamente la sveglia dopo il tempo selezionato." },
        { label: "Durata posticipo automatico", description: "Indica dopo quanto tempo deve partire il posticipo automatico." },
        { label: "Numero massimo di posticipi", description: "Limita il numero di posticipi; Illimitati rimuove il limite." },
        { label: "Salva", description: "Salva la configurazione e torna all’elenco delle sveglie." },
      ],
    },
    profilesList: {
      title: "Help — Profili",
      description: "Crea e gestisci i profili riutilizzabili per le sveglie.",
      entries: [
        { label: "Profilo", description: "Seleziona un profilo per modificarlo. L’etichetta arancione (default) identifica il profilo usato per precompilare le nuove sveglie." },
        { label: "Elimina", description: "Elimina il profilo; le sveglie collegate restano presenti ma vengono sganciate senza cambiare i propri valori." },
        { label: "Nuovo profilo", description: "Apre la maschera per creare un profilo con valori riutilizzabili." },
      ],
    },
    profileEdit: {
      title: "Help — Modifica profilo",
      description: "Definisci i valori che possono essere ereditati dalle sveglie collegate.",
      entries: [
        { label: "Nome profilo", description: "Nome con cui il profilo viene mostrato nell’elenco e nella selezione delle sveglie." },
        { label: "Profilo di default", description: "Rende questo l’unico profilo predefinito. Le nuove sveglie lo associano automaticamente e ne ereditano i valori." },
        { label: "Cancellazione automatica", description: "Imposta se le sveglie collegate devono essere eliminate dopo l’attivazione; Non impostato lascia il valore della singola sveglia." },
        { label: "Suoneria", description: "Suoneria ereditata dalle sveglie collegate, oppure Non impostato per non applicare un valore." },
        { label: "Volume", description: "Volume ereditato dalle sveglie collegate. Il pulsante Non impostato rimuove il valore dal profilo." },
        { label: "Volume incrementale", description: "Durata dell’aumento graduale del volume ereditata dalle sveglie collegate." },
        { label: "Vibrazione", description: "Modalità di vibrazione ereditata dalle sveglie collegate." },
        { label: "Posticipo automatico", description: "Durata del posticipo automatico ereditata dalle sveglie collegate." },
        { label: "Numero massimo di posticipi", description: "Limite dei posticipi ereditato dalle sveglie collegate." },
        { label: "Salva profilo", description: "Salva il profilo. Se è collegato a più sveglie, permette di scegliere quali aggiornare e quali sganciare." },
      ],
    },
    settings: {
      title: "Help — Impostazioni",
      description: "Configura la lingua, l’ordinamento, gli orari personali e i backup.",
      entries: [
        { label: "Lingua", description: "Sceglie la lingua dell’interfaccia e dell’help tra quelle supportate; Lingua del dispositivo segue la lingua del browser." },
        { label: "Ordinamento sveglie", description: "Imposta l’ordinamento predefinito dell’elenco delle sveglie." },
        { label: "Orari personali", description: "Definisce orari rapidi selezionabili nella maschera di creazione delle sveglie." },
        { label: "Etichetta dell’orario personale", description: "Personalizza il nome mostrato per l’orario, lasciando vuoto usa il nome predefinito." },
        { label: "Ora e minuti", description: "Imposta l’orario personale; il pulsante X lo rimuove." },
        { label: "Colore", description: "Sceglie il colore usato per riconoscere l’orario personale nelle schede delle sveglie." },
        { label: "Backup automatico", description: "Attiva il salvataggio automatico giornaliero delle sveglie." },
        { label: "Orario di backup", description: "Indica l’ora in cui eseguire il backup automatico." },
        { label: "Mantieni per", description: "Indica per quanti giorni conservare i backup automatici." },
        { label: "Gestione backup", description: "Crea manualmente un backup oppure ripristina o elimina un backup esistente." },
        { label: "Ricostruisci Help", description: "Solo in preview: ricrea il catalogo completo dell’help in tutte le lingue supportate usando la versione corrente del programma." },
      ],
    },
    alarmActive: {
      title: "Help — Sveglia attiva",
      description: "Comandi disponibili mentre una sveglia sta suonando.",
      entries: [
        { label: "Muta / Smuta", description: "Mette in pausa o riattiva il suono. Non è disponibile quando è attiva la sola vibrazione." },
        { label: "Posticipa", description: "Apre l’elenco delle durate disponibili per rimandare la sveglia." },
        { label: "Clona una tantum", description: "Crea una copia una tantum della sveglia, quando la cancellazione automatica non lo impedisce." },
        { label: "Spegni", description: "Ferma suono e vibrazione e chiude la schermata; per le sveglie una tantum applica anche la cancellazione automatica o la disattivazione." },
        { label: "Posticipo automatico", description: "Quando configurato, mostra il conto alla rovescia e applica il posticipo senza richiedere un’azione." },
      ],
    },
  },
  en: {
    home: { title: "Help — Alarms", description: "Manage, sort, search, and activate your alarms.", entries: [
      { label: "Sort order", description: "Choose activation order, name, or personal-time order." },
      { label: "Search", description: "Opens search. Enter a name and confirm with the check mark or Enter; X restores the full list." },
      { label: "Alarm switch", description: "Enable or disable an alarm without changing its other settings." },
      { label: "Alarm menu", description: "Open actions to edit, clone, simulate sound, skip the next occurrence, or delete the alarm." },
      { label: "New alarm (+)", description: "Create an alarm, prefilled from the default profile when one is available." },
    ] },
    alarmEdit: { title: "Help — Alarm", description: "Configure a new alarm or edit an existing one.", entries: [
      { label: "Personal time", description: "Select a time defined in Settings; its hour and minutes are filled automatically." },
      { label: "Profile", description: "Link the alarm to a profile. Set profile values are inherited and shown in orange; choose No profile to edit them freely." },
      { label: "Label", description: "Descriptive alarm name, also used by search." },
      { label: "Alarm icon", description: "Choose the icon shown on the alarm card." },
      { label: "Repetition", description: "Choose one-time, weekly, or specific-date repetition." },
      { label: "Days of the week", description: "For weekly alarms, choose the days on which it rings." },
      { label: "Specific dates", description: "For date-based alarms, choose one or more calendar dates." },
      { label: "Activation date", description: "For one-time alarms, choose the date on which it rings." },
      { label: "Auto-delete", description: "Delete the alarm after it rings when enabled." },
      { label: "Ringtone", description: "Choose the sound played when the alarm activates." },
      { label: "Volume", description: "Set ringtone volume from 0 to 100 percent." },
      { label: "Gradual volume", description: "Increase volume gradually over the selected number of seconds." },
      { label: "Vibration", description: "Turn vibration off, use it with sound, or use vibration only." },
      { label: "Auto-snooze", description: "Automatically snooze the alarm after the selected delay." },
      { label: "Auto-snooze duration", description: "Choose how long the automatic snooze lasts." },
      { label: "Maximum snooze count", description: "Limit snoozes; Unlimited removes the limit." },
      { label: "Save", description: "Save the configuration and return to the alarm list." },
    ] },
    profilesList: { title: "Help — Profiles", description: "Create and manage reusable alarm profiles.", entries: [
      { label: "Profile", description: "Select a profile to edit it. The orange (default) label identifies the profile used to prefill new alarms." },
      { label: "Delete", description: "Delete the profile; linked alarms remain and are unlinked without changing their values." },
      { label: "New profile", description: "Open the form to create a reusable profile." },
    ] },
    profileEdit: { title: "Help — Edit profile", description: "Define values inherited by linked alarms.", entries: [
      { label: "Profile name", description: "Name shown in the profile list and alarm selector." },
      { label: "Default profile", description: "Make this the only default profile. New alarms link to it and inherit its values." },
      { label: "Auto-delete", description: "Set whether linked alarms are deleted after activation; Not set leaves each alarm's value unchanged." },
      { label: "Ringtone", description: "Ringtone inherited by linked alarms, or Not set to apply no value." },
      { label: "Volume", description: "Volume inherited by linked alarms; Not set removes the profile value." },
      { label: "Gradual volume", description: "Gradual-volume duration inherited by linked alarms." },
      { label: "Vibration", description: "Vibration mode inherited by linked alarms." },
      { label: "Auto-snooze", description: "Automatic snooze duration inherited by linked alarms." },
      { label: "Maximum snooze count", description: "Snooze limit inherited by linked alarms." },
      { label: "Save profile", description: "Save the profile and choose which linked alarms receive changes or are unlinked." },
    ] },
    settings: { title: "Help — Settings", description: "Configure language, sorting, personal times, and backups.", entries: [
      { label: "Language", description: "Choose the interface and help language; Device language follows the browser language." },
      { label: "Alarm sort order", description: "Set the default order of the alarm list." },
      { label: "Personal times", description: "Define quick-select times for the alarm form." },
      { label: "Personal-time label", description: "Customize the displayed name; leave it empty to use the default name." },
      { label: "Time", description: "Set a personal time; X removes it." },
      { label: "Color", description: "Choose the color used to identify the personal time on alarm cards." },
      { label: "Auto backup", description: "Enable daily automatic alarm backups." },
      { label: "Backup time", description: "Choose when the automatic backup runs." },
      { label: "Keep for", description: "Choose how many days automatic backups are retained." },
      { label: "Backup management", description: "Create, restore, or delete a backup." },
      { label: "Rebuild Help", description: "Preview only: rebuild the complete help catalog in every supported language using the current program version." },
    ] },
    alarmActive: { title: "Help — Active alarm", description: "Commands available while an alarm is ringing.", entries: [
      { label: "Mute / Unmute", description: "Pause or resume sound; unavailable in vibration-only mode." },
      { label: "Snooze", description: "Open the available delay options." },
      { label: "Clone as one-time", description: "Create a one-time copy unless auto-delete prevents it." },
      { label: "Dismiss", description: "Stop sound and vibration and close the screen; one-time alarms are deleted or disabled as configured." },
      { label: "Auto-snooze", description: "When configured, show the countdown and snooze automatically." },
    ] },
  },
  fr: {
    home: { title: "Aide — Alarmes", description: "Gérez, triez, recherchez et activez vos alarmes.", entries: [
      { label: "Tri", description: "Choisissez l’ordre d’activation, le nom ou les horaires personnels." }, { label: "Recherche", description: "Saisissez un nom puis confirmez avec la coche ou Entrée; X rétablit la liste complète." }, { label: "Interrupteur", description: "Active ou désactive l’alarme sans modifier ses autres réglages." }, { label: "Menu de l’alarme", description: "Ouvre les actions de modification, copie, simulation, saut ou suppression." }, { label: "Nouvelle alarme (+)", description: "Crée une alarme préremplie par le profil par défaut." },
    ] },
    alarmEdit: { title: "Aide — Alarme", description: "Configurez une alarme nouvelle ou existante.", entries: [
      { label: "Horaire personnel", description: "Sélectionne un horaire défini dans les réglages et remplit l’heure." }, { label: "Profil", description: "Lie l’alarme à un profil; les valeurs héritées sont orange. Sans profil, elles sont modifiables." }, { label: "Libellé", description: "Nom descriptif utilisé aussi par la recherche." }, { label: "Icône", description: "Choisit l’icône affichée sur la carte." }, { label: "Répétition", description: "Choisit unique, hebdomadaire ou dates précises." }, { label: "Jours de la semaine", description: "Jours d’une alarme hebdomadaire." }, { label: "Dates précises", description: "Dates d’une alarme basée sur le calendrier." }, { label: "Date d’activation", description: "Date d’une alarme unique." }, { label: "Suppression automatique", description: "Supprime l’alarme après son activation." }, { label: "Sonnerie", description: "Son joué lors de l’activation." }, { label: "Volume", description: "Volume de 0 à 100 pour cent." }, { label: "Volume progressif", description: "Augmente progressivement le volume." }, { label: "Vibration", description: "Désactive, ajoute ou utilise seulement la vibration." }, { label: "Rappel automatique", description: "Répète automatiquement l’alarme après le délai choisi." }, { label: "Durée du rappel", description: "Durée du rappel automatique." }, { label: "Nombre maximal de rappels", description: "Limite les rappels; Illimité supprime la limite." }, { label: "Enregistrer", description: "Enregistre et revient à la liste." },
    ] },
    profilesList: { title: "Aide — Profils", description: "Gérez les profils réutilisables.", entries: [
      { label: "Profil", description: "Sélectionne un profil; la mention orange (défaut) indique celui des nouvelles alarmes." }, { label: "Supprimer", description: "Supprime le profil et détache ses alarmes sans modifier leurs valeurs." }, { label: "Nouveau profil", description: "Ouvre la création d’un profil." },
    ] },
    profileEdit: { title: "Aide — Modifier un profil", description: "Définissez les valeurs héritées.", entries: [
      { label: "Nom du profil", description: "Nom affiché dans la liste et le sélecteur." }, { label: "Profil par défaut", description: "Rend ce profil unique et l’associe aux nouvelles alarmes." }, { label: "Suppression automatique", description: "Valeur héritée ou Non défini pour garder celle de l’alarme." }, { label: "Sonnerie", description: "Sonnerie héritée ou Non défini." }, { label: "Volume", description: "Volume hérité; Non défini le retire du profil." }, { label: "Volume progressif", description: "Durée héritée de l’augmentation progressive." }, { label: "Vibration", description: "Mode de vibration hérité." }, { label: "Rappel automatique", description: "Durée héritée du rappel." }, { label: "Nombre maximal de rappels", description: "Limite héritée." }, { label: "Enregistrer le profil", description: "Enregistre et permet de choisir les alarmes à mettre à jour." },
    ] },
    settings: { title: "Aide — Réglages", description: "Configurez la langue, le tri, les horaires et les sauvegardes.", entries: [
      { label: "Langue", description: "Choisit la langue de l’interface et de l’aide; la langue de l’appareil suit le navigateur." }, { label: "Tri des alarmes", description: "Définit l’ordre par défaut." }, { label: "Horaires personnels", description: "Définit les horaires rapides du formulaire." }, { label: "Libellé", description: "Personnalise le nom de l’horaire." }, { label: "Heure et minutes", description: "Définit ou retire l’horaire." }, { label: "Couleur", description: "Choisit la couleur de repérage." }, { label: "Sauvegarde automatique", description: "Active la sauvegarde quotidienne." }, { label: "Heure de sauvegarde", description: "Choisit l’heure de la sauvegarde." }, { label: "Conserver pendant", description: "Durée de conservation." }, { label: "Gestion des sauvegardes", description: "Crée, restaure ou supprime une sauvegarde." }, { label: "Reconstruire l’aide", description: "Preview uniquement: reconstruit l’aide dans toutes les langues." },
    ] },
    alarmActive: { title: "Aide — Alarme active", description: "Commandes pendant la sonnerie.", entries: [
      { label: "Muet / Son", description: "Met en pause ou reprend le son." }, { label: "Rappel", description: "Ouvre les durées de rappel." }, { label: "Copie unique", description: "Crée une copie ponctuelle." }, { label: "Arrêter", description: "Arrête le son et la vibration." }, { label: "Rappel automatique", description: "Affiche le compte à rebours et répète automatiquement." },
    ] },
  },
  de: {
    home: { title: "Hilfe — Wecker", description: "Wecker verwalten, sortieren, suchen und aktivieren.", entries: [
      { label: "Sortierung", description: "Sortiert nach Aktivierung, Name oder persönlichen Zeiten." }, { label: "Suche", description: "Nach Eingabe mit Häkchen oder Eingabetaste bestätigen; X zeigt alle Wecker." }, { label: "Schalter", description: "Aktiviert oder deaktiviert den Wecker." }, { label: "Weckermenü", description: "Öffnet Bearbeiten, Kopieren, Ton testen, Überspringen und Löschen." }, { label: "Neuer Wecker (+)", description: "Erstellt einen Wecker mit den Werten des Standardprofils." },
    ] },
    alarmEdit: { title: "Hilfe — Wecker", description: "Neuen Wecker erstellen oder vorhandenen bearbeiten.", entries: [
      { label: "Persönliche Zeit", description: "Übernimmt eine Zeit aus den Einstellungen." }, { label: "Profil", description: "Verknüpft ein Profil; geerbte Werte sind orange. Ohne Profil sind sie frei bearbeitbar." }, { label: "Bezeichnung", description: "Name des Weckers und Suchbegriff." }, { label: "Weckersymbol", description: "Symbol der Weckerkarte." }, { label: "Wiederholung", description: "Einmalig, wöchentlich oder bestimmte Daten." }, { label: "Wochentage", description: "Tage für wöchentliche Wecker." }, { label: "Bestimmte Daten", description: "Kalendertage für den Wecker." }, { label: "Aktivierungsdatum", description: "Datum eines einmaligen Weckers." }, { label: "Automatisch löschen", description: "Löscht den Wecker nach der Aktivierung." }, { label: "Klingelton", description: "Ton beim Auslösen." }, { label: "Lautstärke", description: "Lautstärke von 0 bis 100 Prozent." }, { label: "Ansteigende Lautstärke", description: "Erhöht die Lautstärke schrittweise." }, { label: "Vibration", description: "Aus, zusammen mit Ton oder nur Vibration." }, { label: "Automatisches Schlummern", description: "Schlummert nach der gewählten Zeit automatisch." }, { label: "Schlummerdauer", description: "Dauer des automatischen Schlummerns." }, { label: "Maximale Schlummerzahl", description: "Begrenzt Schlummern; Unbegrenzt entfernt die Grenze." }, { label: "Speichern", description: "Speichert und öffnet die Weckerliste." },
    ] },
    profilesList: { title: "Hilfe — Profile", description: "Wiederverwendbare Weckerprofile verwalten.", entries: [
      { label: "Profil", description: "Profil zum Bearbeiten wählen; (Standard) markiert das Profil für neue Wecker." }, { label: "Löschen", description: "Löscht das Profil und löst Verknüpfungen ohne Werte zu ändern." }, { label: "Neues Profil", description: "Öffnet die Profilerstellung." },
    ] },
    profileEdit: { title: "Hilfe — Profil bearbeiten", description: "Vererbte Werte festlegen.", entries: [
      { label: "Profilname", description: "Name in Liste und Auswahl." }, { label: "Standardprofil", description: "Macht dieses Profil zum einzigen Standardprofil für neue Wecker." }, { label: "Automatisch löschen", description: "Geerbter Löschwert oder Nicht festgelegt." }, { label: "Klingelton", description: "Geerbter Ton oder Nicht festgelegt." }, { label: "Lautstärke", description: "Geerbte Lautstärke; Nicht festgelegt entfernt den Wert." }, { label: "Ansteigende Lautstärke", description: "Geerbte Dauer." }, { label: "Vibration", description: "Geerbter Vibrationsmodus." }, { label: "Automatisches Schlummern", description: "Geerbte Schlummerdauer." }, { label: "Maximale Schlummerzahl", description: "Geerbte Begrenzung." }, { label: "Profil speichern", description: "Speichert und lässt verknüpfte Wecker auswählen." },
    ] },
    settings: { title: "Hilfe — Einstellungen", description: "Sprache, Sortierung, Zeiten und Sicherungen konfigurieren.", entries: [
      { label: "Sprache", description: "Sprache von Oberfläche und Hilfe; Gerätesprache folgt dem Browser." }, { label: "Weckersortierung", description: "Standardreihenfolge der Liste." }, { label: "Persönliche Zeiten", description: "Schnellauswahlzeiten für das Weckerformular." }, { label: "Bezeichnung", description: "Name der persönlichen Zeit." }, { label: "Zeit", description: "Zeit setzen oder mit X entfernen." }, { label: "Farbe", description: "Farbe zur Erkennung der persönlichen Zeit." }, { label: "Automatische Sicherung", description: "Tägliche Sicherungen aktivieren." }, { label: "Sicherungszeit", description: "Zeit der automatischen Sicherung." }, { label: "Aufbewahren für", description: "Aufbewahrungsdauer der Sicherungen." }, { label: "Sicherungsverwaltung", description: "Sicherungen erstellen, wiederherstellen oder löschen." }, { label: "Hilfe neu aufbauen", description: "Nur in der Preview: erstellt die vollständige Hilfe in allen Sprachen neu." },
    ] },
    alarmActive: { title: "Hilfe — Aktiver Wecker", description: "Befehle während des Klingelns.", entries: [
      { label: "Stumm / Ton", description: "Ton pausieren oder fortsetzen." }, { label: "Schlummern", description: "Verfügbare Verzögerungen öffnen." }, { label: "Einmalig kopieren", description: "Einmalige Kopie erstellen." }, { label: "Ausschalten", description: "Ton und Vibration stoppen." }, { label: "Automatisches Schlummern", description: "Countdown anzeigen und automatisch schlummern." },
    ] },
  },
  es: {
    home: { title: "Ayuda — Alarmas", description: "Gestiona, ordena, busca y activa tus alarmas.", entries: [
      { label: "Orden", description: "Ordena por activación, nombre u horarios personales." }, { label: "Buscar", description: "Confirma con la marca o Enter; X restaura la lista completa." }, { label: "Interruptor", description: "Activa o desactiva la alarma." }, { label: "Menú de alarma", description: "Abre editar, clonar, probar sonido, saltar o eliminar." }, { label: "Nueva alarma (+)", description: "Crea una alarma con el perfil predeterminado." },
    ] },
    alarmEdit: { title: "Ayuda — Alarma", description: "Configura una alarma nueva o existente.", entries: [
      { label: "Horario personal", description: "Usa un horario definido en Ajustes." }, { label: "Perfil", description: "Vincula un perfil; los valores heredados aparecen en naranja. Sin perfil puedes editarlos." }, { label: "Etiqueta", description: "Nombre descriptivo y término de búsqueda." }, { label: "Icono", description: "Icono de la tarjeta." }, { label: "Repetición", description: "Una vez, semanal o fechas específicas." }, { label: "Días de la semana", description: "Días de una alarma semanal." }, { label: "Fechas específicas", description: "Fechas del calendario." }, { label: "Fecha de activación", description: "Fecha de una alarma única." }, { label: "Borrado automático", description: "Borra la alarma tras activarse." }, { label: "Tono", description: "Sonido de activación." }, { label: "Volumen", description: "Volumen de 0 a 100 por ciento." }, { label: "Volumen gradual", description: "Aumenta el volumen progresivamente." }, { label: "Vibración", description: "Desactivada, con sonido o solo vibración." }, { label: "Posponer automáticamente", description: "Pospone tras el tiempo elegido." }, { label: "Duración", description: "Duración del pospuesto automático." }, { label: "Máximo de pospuestos", description: "Limita los pospuestos; Ilimitados quita el límite." }, { label: "Guardar", description: "Guarda y vuelve a la lista." },
    ] },
    profilesList: { title: "Ayuda — Perfiles", description: "Gestiona perfiles reutilizables.", entries: [
      { label: "Perfil", description: "Selecciona un perfil; (predeterminado) indica el usado para alarmas nuevas." }, { label: "Eliminar", description: "Elimina y desvincula sin cambiar los valores de las alarmas." }, { label: "Nuevo perfil", description: "Abre la creación de un perfil." },
    ] },
    profileEdit: { title: "Ayuda — Editar perfil", description: "Define valores heredables.", entries: [
      { label: "Nombre del perfil", description: "Nombre en la lista y selector." }, { label: "Perfil predeterminado", description: "Lo convierte en el único perfil predeterminado para nuevas alarmas." }, { label: "Borrado automático", description: "Valor heredado o Sin configurar." }, { label: "Tono", description: "Tono heredado o Sin configurar." }, { label: "Volumen", description: "Volumen heredado; Sin configurar lo elimina." }, { label: "Volumen gradual", description: "Duración heredada." }, { label: "Vibración", description: "Modo heredado." }, { label: "Pospuesto automático", description: "Duración heredada." }, { label: "Máximo de pospuestos", description: "Límite heredado." }, { label: "Guardar perfil", description: "Guarda y permite elegir alarmas vinculadas." },
    ] },
    settings: { title: "Ayuda — Ajustes", description: "Configura idioma, orden, horarios y copias.", entries: [
      { label: "Idioma", description: "Idioma de interfaz y ayuda; el idioma del dispositivo sigue al navegador." }, { label: "Orden de alarmas", description: "Orden predeterminado." }, { label: "Horarios personales", description: "Horarios rápidos del formulario." }, { label: "Etiqueta", description: "Nombre del horario." }, { label: "Hora", description: "Define o elimina el horario." }, { label: "Color", description: "Color identificativo." }, { label: "Copia automática", description: "Activa copias diarias." }, { label: "Hora de copia", description: "Hora de la copia." }, { label: "Conservar durante", description: "Días de conservación." }, { label: "Gestión de copias", description: "Crea, restaura o elimina copias." }, { label: "Reconstruir ayuda", description: "Solo en preview: reconstruye la ayuda en todos los idiomas." },
    ] },
    alarmActive: { title: "Ayuda — Alarma activa", description: "Comandos durante el sonido.", entries: [
      { label: "Silenciar / Activar sonido", description: "Pausa o reanuda el sonido." }, { label: "Posponer", description: "Abre las duraciones." }, { label: "Clonar una vez", description: "Crea una copia única." }, { label: "Apagar", description: "Detiene sonido y vibración." }, { label: "Pospuesto automático", description: "Muestra la cuenta atrás y pospone." },
    ] },
  },
  pt: {
    home: { title: "Ajuda — Alarmes", description: "Gira, ordena, pesquisa e ativa os alarmes.", entries: [
      { label: "Ordenação", description: "Ordena por ativação, nome ou horários pessoais." }, { label: "Pesquisa", description: "Confirme com a marca ou Enter; X restaura a lista completa." }, { label: "Interruptor", description: "Ativa ou desativa o alarme." }, { label: "Menu do alarme", description: "Abre editar, clonar, testar som, saltar ou eliminar." }, { label: "Novo alarme (+)", description: "Cria um alarme com o perfil predefinido." },
    ] },
    alarmEdit: { title: "Ajuda — Alarme", description: "Configure um alarme novo ou existente.", entries: [
      { label: "Horário pessoal", description: "Usa um horário definido nas definições." }, { label: "Perfil", description: "Liga um perfil; valores herdados ficam laranja. Sem perfil, pode editá-los." }, { label: "Etiqueta", description: "Nome descritivo e termo de pesquisa." }, { label: "Ícone", description: "Ícone do cartão." }, { label: "Repetição", description: "Uma vez, semanal ou datas específicas." }, { label: "Dias da semana", description: "Dias de um alarme semanal." }, { label: "Datas específicas", description: "Datas do calendário." }, { label: "Data de ativação", description: "Data de um alarme único." }, { label: "Eliminação automática", description: "Elimina após a ativação." }, { label: "Toque", description: "Som de ativação." }, { label: "Volume", description: "Volume de 0 a 100 por cento." }, { label: "Volume gradual", description: "Aumenta o volume progressivamente." }, { label: "Vibração", description: "Desligada, com som ou apenas vibração." }, { label: "Adiar automaticamente", description: "Adia após o tempo escolhido." }, { label: "Duração", description: "Duração do adiamento automático." }, { label: "Máximo de adiamentos", description: "Limita adiamentos; Ilimitados remove o limite." }, { label: "Guardar", description: "Guarda e volta à lista." },
    ] },
    profilesList: { title: "Ajuda — Perfis", description: "Gira perfis reutilizáveis.", entries: [
      { label: "Perfil", description: "Selecione um perfil; (predefinido) indica o usado para alarmes novos." }, { label: "Eliminar", description: "Elimina e desliga sem alterar valores dos alarmes." }, { label: "Novo perfil", description: "Abre a criação de perfil." },
    ] },
    profileEdit: { title: "Ajuda — Editar perfil", description: "Defina valores herdáveis.", entries: [
      { label: "Nome do perfil", description: "Nome na lista e no seletor." }, { label: "Perfil predefinido", description: "Torna-o o único perfil predefinido para alarmes novos." }, { label: "Eliminação automática", description: "Valor herdado ou Não definido." }, { label: "Toque", description: "Toque herdado ou Não definido." }, { label: "Volume", description: "Volume herdado; Não definido remove-o." }, { label: "Volume gradual", description: "Duração herdada." }, { label: "Vibração", description: "Modo herdado." }, { label: "Adiamento automático", description: "Duração herdada." }, { label: "Máximo de adiamentos", description: "Limite herdado." }, { label: "Guardar perfil", description: "Guarda e permite escolher alarmes ligados." },
    ] },
    settings: { title: "Ajuda — Definições", description: "Configure idioma, ordenação, horários e cópias.", entries: [
      { label: "Idioma", description: "Idioma da interface e ajuda; idioma do dispositivo segue o navegador." }, { label: "Ordenação dos alarmes", description: "Ordem predefinida." }, { label: "Horários pessoais", description: "Horários rápidos do formulário." }, { label: "Etiqueta", description: "Nome do horário." }, { label: "Hora", description: "Define ou remove o horário." }, { label: "Cor", description: "Cor de identificação." }, { label: "Cópia automática", description: "Ativa cópias diárias." }, { label: "Hora da cópia", description: "Hora da cópia." }, { label: "Manter por", description: "Dias de retenção." }, { label: "Gestão de cópias", description: "Cria, restaura ou elimina cópias." }, { label: "Reconstruir ajuda", description: "Apenas na preview: reconstrói a ajuda em todos os idiomas." },
    ] },
    alarmActive: { title: "Ajuda — Alarme ativo", description: "Comandos durante o toque.", entries: [
      { label: "Silenciar / Ativar som", description: "Pausa ou retoma o som." }, { label: "Adiar", description: "Abre as durações." }, { label: "Clonar uma vez", description: "Cria uma cópia única." }, { label: "Desligar", description: "Para som e vibração." }, { label: "Adiamento automático", description: "Mostra a contagem e adia." },
    ] },
  },
  zh: {
    home: { title: "帮助 — 闹钟", description: "管理、排序、搜索和启用闹钟。", entries: [
      { label: "排序", description: "按激活顺序、名称或个人时间排序。" }, { label: "搜索", description: "输入名称后点击勾选或按回车确认；X 恢复完整列表。" }, { label: "闹钟开关", description: "启用或停用闹钟，不改变其他设置。" }, { label: "闹钟菜单", description: "打开编辑、克隆、试听、跳过或删除操作。" }, { label: "新建闹钟 (+)", description: "使用默认配置预填新闹钟。" },
    ] },
    alarmEdit: { title: "帮助 — 闹钟", description: "创建或编辑闹钟。", entries: [
      { label: "个人时间", description: "选择设置中定义的时间并自动填入。" }, { label: "配置", description: "关联配置；继承值显示为橙色。选择无配置即可自由编辑。" }, { label: "标签", description: "闹钟名称，也用于搜索。" }, { label: "闹钟图标", description: "选择卡片图标。" }, { label: "重复", description: "一次、每周或指定日期。" }, { label: "星期", description: "每周闹钟的响铃日。" }, { label: "指定日期", description: "从日历选择日期。" }, { label: "激活日期", description: "一次性闹钟的日期。" }, { label: "自动删除", description: "响铃后删除闹钟。" }, { label: "铃声", description: "激活时播放的声音。" }, { label: "音量", description: "设置 0 到 100% 的音量。" }, { label: "渐增音量", description: "逐渐增加音量。" }, { label: "振动", description: "关闭、与声音一起或仅振动。" }, { label: "自动稍后提醒", description: "在选定延迟后自动稍后提醒。" }, { label: "持续时间", description: "自动稍后提醒的时长。" }, { label: "最大次数", description: "限制次数；无限制表示不限制。" }, { label: "保存", description: "保存并返回列表。" },
    ] },
    profilesList: { title: "帮助 — 配置", description: "管理可重复使用的闹钟配置。", entries: [
      { label: "配置", description: "选择配置编辑；橙色的默认标记表示新闹钟使用的配置。" }, { label: "删除", description: "删除配置并解除关联，不改变闹钟值。" }, { label: "新建配置", description: "打开配置创建表单。" },
    ] },
    profileEdit: { title: "帮助 — 编辑配置", description: "设置可继承的值。", entries: [
      { label: "配置名称", description: "列表和选择器中显示的名称。" }, { label: "默认配置", description: "设为唯一默认配置，供新闹钟关联和继承。" }, { label: "自动删除", description: "关联闹钟继承的删除设置，未设置则保留闹钟自身值。" }, { label: "铃声", description: "关联闹钟继承的铃声。" }, { label: "音量", description: "关联闹钟继承的音量；未设置则不应用。" }, { label: "渐增音量", description: "继承的渐增时长。" }, { label: "振动", description: "继承的振动模式。" }, { label: "自动稍后提醒", description: "继承的延迟时长。" }, { label: "最大次数", description: "继承的次数限制。" }, { label: "保存配置", description: "保存并选择需要更新或解除关联的闹钟。" },
    ] },
    settings: { title: "帮助 — 设置", description: "配置语言、排序、个人时间和备份。", entries: [
      { label: "语言", description: "选择界面和帮助语言；设备语言跟随浏览器。" }, { label: "闹钟排序", description: "设置列表默认顺序。" }, { label: "个人时间", description: "设置表单中的快捷时间。" }, { label: "标签", description: "自定义时间名称。" }, { label: "时间", description: "设置或删除时间。" }, { label: "颜色", description: "选择识别颜色。" }, { label: "自动备份", description: "启用每日备份。" }, { label: "备份时间", description: "选择备份时间。" }, { label: "保留时间", description: "选择备份保留天数。" }, { label: "备份管理", description: "创建、恢复或删除备份。" }, { label: "重建帮助", description: "仅限预览：用当前程序版本重建所有支持语言的帮助。" },
    ] },
    alarmActive: { title: "帮助 — 活动闹钟", description: "闹钟响铃时可用的操作。", entries: [
      { label: "静音 / 恢复声音", description: "暂停或恢复声音。" }, { label: "稍后提醒", description: "打开延迟选项。" }, { label: "克隆一次", description: "创建一次性副本。" }, { label: "停止", description: "停止声音和振动。" }, { label: "自动稍后提醒", description: "显示倒计时并自动延迟。" },
    ] },
  },
  ko: {
    home: { title: "도움말 — 알람", description: "알람을 관리하고 정렬하고 검색하고 활성화합니다.", entries: [
      { label: "정렬", description: "활성화 순서, 이름 또는 개인 시간으로 정렬합니다." }, { label: "검색", description: "이름을 입력하고 확인 표시 또는 Enter로 확정합니다. X는 전체 목록을 복원합니다." }, { label: "알람 스위치", description: "다른 설정을 바꾸지 않고 알람을 켜거나 끕니다." }, { label: "알람 메뉴", description: "편집, 복제, 소리 테스트, 건너뛰기, 삭제를 엽니다." }, { label: "새 알람 (+)", description: "기본 프로필 값으로 새 알람을 미리 채웁니다." },
    ] },
    alarmEdit: { title: "도움말 — 알람", description: "새 알람을 만들거나 기존 알람을 수정합니다.", entries: [
      { label: "개인 시간", description: "설정에서 정의한 시간을 선택해 시각을 자동 입력합니다." }, { label: "프로필", description: "프로필을 연결합니다. 상속 값은 주황색으로 표시되며 프로필 없음을 선택하면 직접 수정할 수 있습니다." }, { label: "레이블", description: "알람 이름이며 검색에도 사용됩니다." }, { label: "알람 아이콘", description: "카드에 표시할 아이콘입니다." }, { label: "반복", description: "한 번, 매주 또는 특정 날짜를 선택합니다." }, { label: "요일", description: "주간 알람의 요일입니다." }, { label: "특정 날짜", description: "달력에서 날짜를 선택합니다." }, { label: "활성화 날짜", description: "일회성 알람의 날짜입니다." }, { label: "자동 삭제", description: "알람이 울린 후 삭제합니다." }, { label: "벨소리", description: "알람이 울릴 때 재생할 소리입니다." }, { label: "볼륨", description: "0~100% 볼륨입니다." }, { label: "점진적 볼륨", description: "볼륨을 서서히 높입니다." }, { label: "진동", description: "끄기, 소리와 함께 또는 진동만 사용합니다." }, { label: "자동 다시 알림", description: "선택한 시간 뒤 자동으로 다시 알립니다." }, { label: "시간", description: "자동 다시 알림의 지속 시간입니다." }, { label: "최대 횟수", description: "다시 알림 횟수를 제한합니다. 무제한은 제한이 없습니다." }, { label: "저장", description: "저장하고 목록으로 돌아갑니다." },
    ] },
    profilesList: { title: "도움말 — 프로필", description: "재사용 가능한 알람 프로필을 관리합니다.", entries: [
      { label: "프로필", description: "프로필을 선택해 수정합니다. 주황색 기본 표시는 새 알람에 사용되는 프로필입니다." }, { label: "삭제", description: "프로필을 삭제하고 연결을 해제하지만 알람 값은 바꾸지 않습니다." }, { label: "새 프로필", description: "프로필 생성 화면을 엽니다." },
    ] },
    profileEdit: { title: "도움말 — 프로필 수정", description: "상속할 값을 설정합니다.", entries: [
      { label: "프로필 이름", description: "목록과 선택기에 표시되는 이름입니다." }, { label: "기본 프로필", description: "새 알람이 연결하고 값을 상속할 유일한 기본 프로필로 지정합니다." }, { label: "자동 삭제", description: "연결된 알람에 상속할 삭제 설정입니다. 설정 안 함은 알람 값을 유지합니다." }, { label: "벨소리", description: "상속할 벨소리입니다." }, { label: "볼륨", description: "상속할 볼륨입니다. 설정 안 함은 적용하지 않습니다." }, { label: "점진적 볼륨", description: "상속할 증가 시간입니다." }, { label: "진동", description: "상속할 진동 모드입니다." }, { label: "자동 다시 알림", description: "상속할 지연 시간입니다." }, { label: "최대 횟수", description: "상속할 횟수 제한입니다." }, { label: "프로필 저장", description: "저장하고 업데이트하거나 연결 해제할 알람을 선택합니다." },
    ] },
    settings: { title: "도움말 — 설정", description: "언어, 정렬, 개인 시간과 백업을 설정합니다.", entries: [
      { label: "언어", description: "인터페이스와 도움말 언어를 선택합니다. 기기 언어는 브라우저를 따릅니다." }, { label: "알람 정렬", description: "목록의 기본 순서입니다." }, { label: "개인 시간", description: "알람 화면에서 사용할 빠른 시간을 설정합니다." }, { label: "레이블", description: "시간 이름을 지정합니다." }, { label: "시간", description: "시간을 설정하거나 삭제합니다." }, { label: "색상", description: "개인 시간을 구분할 색상입니다." }, { label: "자동 백업", description: "매일 자동 백업을 활성화합니다." }, { label: "백업 시간", description: "자동 백업 시간입니다." }, { label: "보관 기간", description: "백업을 보관할 날짜 수입니다." }, { label: "백업 관리", description: "백업을 만들고 복원하고 삭제합니다." }, { label: "도움말 재구성", description: "미리보기에서만 현재 버전으로 모든 지원 언어의 도움말을 다시 만듭니다." },
    ] },
    alarmActive: { title: "도움말 — 활성 알람", description: "알람이 울릴 때 사용할 수 있는 명령입니다.", entries: [
      { label: "음소거 / 소리 켜기", description: "소리를 일시 중지하거나 다시 켭니다." }, { label: "다시 알림", description: "지연 시간을 엽니다." }, { label: "한 번 복제", description: "일회성 사본을 만듭니다." }, { label: "끄기", description: "소리와 진동을 멈춥니다." }, { label: "자동 다시 알림", description: "카운트다운 후 자동으로 다시 알립니다." },
    ] },
  },
};

function languageKey(language: string): SupportedLanguage {
  const base = language.split("-")[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(base) ? base : "it";
}

export function getHelpCatalog(language: string): HelpCatalog {
  return HELP_CATALOG[languageKey(language)];
}

export function rebuildHelpCatalog(): number {
  for (const language of SUPPORTED_LANGUAGES) {
    localStorage.setItem(
      `${HELP_STORAGE_PREFIX}${language}`,
      JSON.stringify({
        version: HELP_CATALOG_VERSION,
        language,
        generatedAt: new Date().toISOString(),
        screens: HELP_CATALOG[language],
      }),
    );
  }
  return SUPPORTED_LANGUAGES.length;
}

export function HelpButton({ screen }: { screen: HelpScreen }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const content = getHelpCatalog(i18n.resolvedLanguage || i18n.language)[screen];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={content.title}
          title={content.title}
          className="relative -top-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/20 transition-transform hover:scale-105 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-background"
        >
          <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.75} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-6">
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {content.entries.map(entry => (
            <div key={entry.label} className="text-sm leading-6">
              <strong className="font-bold">{entry.label}</strong>{" "}
              <span className="text-muted-foreground">{entry.description}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}