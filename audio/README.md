# THE UNYIELDING — audio overrides

Every sound in the game is synthesized live (WebAudio). To replace any of them with a real file
(your music, ElevenLabs SFX, etc.):

1. Put the file in this `audio/` folder (mp3, ogg, wav or m4a; mp3/m4a work in every browser).
2. Add a line to `audio/audio.json` mapping the sound name to the file, e.g.

```json
{
  "music_explore": "explore_theme.mp3",
  "music_boss":    { "file": "vampire_knight.mp3", "vol": 0.6 },
  "secret":        "reliquary_opens.wav",
  "hit":           { "file": "flesh_hit.wav", "vol": 0.9 }
}
```

3. Reload the page (Cmd+Shift+R). Names not listed keep the synth sound. If a file fails to load,
   the game logs a warning and keeps the synth version.

`vol` is optional (1 = as recorded; music defaults to 0.5). Music files loop seamlessly with a short crossfade. See the Music section for sharing a few songs across all slots.

## Music (M7c: a few songs shared across every slot)
You don't need a song per stage. Name each song **once** under `"tracks"`, then point any number of
**slots** at it under `"music"`:

```json
{
  "tracks": {
    "bighouse": { "file": "hub_bighouse.mp3", "alt": ["hub_bighouse.m4a"], "vol": 0.55, "xf": 2.0 },
    "bossA":    { "file": "boss_song_1.mp3", "vol": 0.6 },
    "lich":     { "file": "lich_theme.mp3" }
  },
  "music": {
    "default": "bighouse",
    "explore": "bighouse",
    "boss":    "bossA",
    "boss_lich": "lich"
  }
}
```

* `file` + optional `alt` (fallback formats), `vol` (music default 0.5), `xf` = loop crossfade seconds (default 2).
* Songs loop seamlessly (equal-power crossfade of the tail into the head, `xf` seconds long).
* Changing slot (stage -> boss -> next stage -> Chapel...) crossfades to the new song. If the new slot
  maps to **the same track**, it just keeps playing, with no restart.
* When at least one song is mapped, the synth music is off. The synth sound effects stay.
  If no song resolves (or the files fail to load), the old synth music plays as a fallback.

### Slots and how each falls back (first one that maps to a loaded track wins)
| situation | slot chain |
|---|---|
| title screen | `title` -> `hub` -> `default` |
| Chapel hub | `hub` -> `stage_hub` -> `explore` -> `default` |
| a stage (exploring) | `stage_<key>` -> `explore` -> `default` |
| a boss fight | `boss_<key>` -> `boss` -> `stage_<key>` -> `explore` -> `default` |
| the Abyss (exploring) | `stage_abyss` -> `abyss` -> `explore` -> `default` |
| a corrupted Abyss boss | `boss_abyss` -> `abyss_boss` -> `boss_<key>` -> `boss` -> `stage_abyss` -> `abyss` -> `default` |
| victory / credits | `victory` -> `stage_victory` -> `explore` -> `default` |

Stage keys: `castle` (1), `crypt` (2), `ossuary` (3), `courtyard` (4), `belfry` (5), `arena` (6),
`necropolis` (7), `kennels` (8), `cathedral` (9), `throne` (10), `abyss`.
Boss keys: `vknight`, `spider`, `colossus`, `alphawolf`, `matriarch`, `minotaur`, `witch`,
`hellhound`, `uknight`, `lich`, `abyss`.

**Right now** every slot plays `bighouse` (your song) on a loop: title, Chapel, all 10 stages,
every boss, the Abyss and the victory screen. Got a boss song? Add it to `"tracks"` and set
`"boss": "<name>"` (all bosses) or `"boss_lich": "<name>"` (just one boss).

Legacy: a top-level `"music_<slot>": "file.mp3"` entry (the old format) still works and beats the mapping for that slot.

## Sound effects
| name | used for |
|---|---|
| `howl` | werewolf / Alpha howl |
| `toll` | belfry bell toll (Matriarch) |
| `wing` | gargoyle wing beat / Matriarch swoop |
| `swing` | light sword swing |
| `swingH` | heavy sword swing / combo finisher swing |
| `hit` | sword hitting flesh |
| `heavy` | heavy hit / knockdown |
| `gib` | enemy torn apart |
| `finisher` | finishing move / boss execution |
| `whip` | whip crack |
| `latch` | whip latching onto a hook |
| `block` | shield blocks a hit, metal-on-metal impacts, shield swap |
| `parry` | perfect parry |
| `pistol` | holy pistol shot |
| `step` | footstep |
| `jump` | jump |
| `land` | landing |
| `dodge` | roll |
| `hurt` | Baron takes damage |
| `pickup` | item / relic pickup |
| `secret` | secret found |
| `stone` | stone doors / walls grinding open |
| `clink` | metal clink (bone/armor debris landing, sparks) |
| `glint` | perfect-dodge / boss attack glint shimmer |
| `windup` | enemy wind-up tell |
| `fire` | imp fireball |
| `groan` | zombies / undead groan |
| `screech` | bats, flyers, boss scream |
| `giggle` | imps |
| `ghost` | ghosts / wraiths |
| `rattle` | skeleton / skull-wall rattle, spider brood |
| `rattle` | skeleton bones |
| `roar` | boss roar / phase 2 |

Tip for ElevenLabs: generate 0.2–1.5 s one-shots with no leading silence; trim tails so rapid
sounds (`hit`, `step`, `swing`) don't stack up.


## Installed tracks
- `bighouse`: `hub_bighouse.mp3` (AAC `hub_bighouse.m4a` as a fallback), BEER-FAST's track 1. Since M7c it's mapped to **every** slot
  (`default`, `title`, `hub`, `explore`, `boss`, `abyss`, `victory`). It loops with a 2s equal-power crossfade and carries on uninterrupted
  across stage, boss, Chapel and victory changes, because every slot points at the same track.

## Sound effects pack (M7d: ElevenLabs)
`audio/sfx/` holds 65 generated effects (`<name>.ogg` + `<name>.mp3`; the game loads ogg where the browser supports it and falls back to mp3).
They are listed in the `"sfx"` section of `audio.json`:

```json
"sfx": {
  "_dir": "sfx/", "_gain": 1.0,
  "hit": 0.85,                                          // volume only, file = sfx/hit.ogg|mp3
  "intro_lich": { "vol": 1, "fixed": true, "duck": 0.35, "max": 1 },
  "door": { "file": "door", "vol": 0.85 }              // optional "file" = a different file name in sfx/
}
```

* `vol` = loudness (1 = as mastered, all files are normalised to about the same level). `_gain` scales every effect.
* Every effect gets a slight random pitch (±6%) and volume (±10%) change so repeats don't sound identical; `fixed: true` turns that off (boss stingers).
* `duck` = how far the music dips while it plays (0.35 = to 35%), for boss intros, deaths, level clear and so on.
* `max` = how many copies of that sound may overlap (default 3). The game never plays more than 18 sample voices at once; the oldest one fades out.
* **Remove a line and the old synthesized sound comes back.** A sound whose file is missing or still loading also uses the synth version.
* A top-level entry (the old format) with the same name wins over the `"sfx"` entry.
* To swap in your own: drop `audio/sfx/<name>.mp3` (and `.ogg`, or delete the old `.ogg`) and reload.

Names: generic sounds replace the synth (`swing swingH hit heavy gib whip latch block parry finisher pistol dodge step jump land hurt fire secret`);
new events: `ui_click` (Chapel altar menu), `swing_axe swing_great swing_void xbow_fire xbow_crank bolt_impact player_death heartbeat`,
`growl_/attack_/death_` + `undead beast winged spirit armored`, `intro_` + each boss (`vknight spider colossus alphawolf matriarch minotaur witch hellhound uknight lich`),
`lich_phase2 lich_phase3 boss_death secret_wall door pickup_health pickup_shards pickup_relic pickup_weapon altar_buy level_clear abyss_descend abyss_ambience` (looping bed in the Abyss).
