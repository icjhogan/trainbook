// Build the vision-extraction prompt. The year guidance is parameterized so historical
// backfill doesn't get misdated: with an anchor year, undated pages resolve to it; without
// one, the model is told NOT to assume the current year and to flag year uncertainty.
export function buildExtractionPrompt(anchorYear?: number | string): string {
  const year = anchorYear ? String(anchorYear).trim() : "";
  const yearGuidance = year
    ? `These pages are from ${year}. Resolve any date without an explicit year to ${year}, unless the page clearly states a different year.`
    : `Do NOT assume the current year. If a date has no explicit year written on the page, infer it from context where possible; if you cannot determine the year, add a note such as "year uncertain" to the flags array.`;

  return `You are extracting handwritten track & field workout data from a scanned notebook page.

The page may contain one or more workouts. Each workout starts with a date header.

For EACH workout on this page, extract a JSON object with these fields:

{
  "date": "the date as written (e.g. 'Wednesday, November 12th')",
  "date_iso": "ISO date (YYYY-MM-DD). ${yearGuidance}",
  "workout_type": "the type/category (e.g. 'Tempo', 'Extensive Tempo', 'Intensive Tempo', 'Speed', 'High Jump', 'Long Jump', 'Hurdles', 'Meet', 'Practice', etc.)",
  "event_focus": ["array of event focuses if identifiable (e.g. 'High Jump', 'Long Jump', '200m', 'Hurdles', 'Sprints')"],
  "exercises": [
    {
      "description": "what was done (e.g. '4x350s @55', '600 @ 2:03')",
      "distance": "distance per rep if applicable (e.g. '350m', '600m')",
      "reps": null,
      "sets": null,
      "times": ["list of recorded split times as strings"],
      "rest": "rest interval if noted (e.g. '6min', '10min')",
      "notes": "any additional detail about this exercise"
    }
  ],
  "technical_cues": ["list of technique notes, coaching cues, or focus points mentioned"],
  "personal_notes": "any subjective comments (how they felt, injuries, conditions, etc.)",
  "raw_text": "your best transcription of ALL the text for this workout entry, preserving structure",
  "flags": ["list of data quality concerns, e.g. 'time 57.5 is an outlier', 'distance unclear', 'year uncertain'"]
}

Important guidelines:
- Extract EVERY workout on the page, even partial ones
- Preserve exact times/splits as written — do not round or correct
- For the raw_text field, transcribe everything you can read, using line breaks to preserve layout
- If something is unclear, include your best guess with [?] marker
- Include technical/coaching cues separately from exercise descriptions
- Note any mentions of injuries, feelings, or conditions in personal_notes
- If the workout mentions a meet/competition, set workout_type to "Meet"
- Add any uncertain readings to the flags array

Return a JSON array of workout objects. Return ONLY valid JSON, no markdown fencing.`;
}
