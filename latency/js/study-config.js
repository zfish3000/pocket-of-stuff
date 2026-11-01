// Study-wide settings for everyone who opens the published site.
// Change them here, commit, and push: the commit history records when each setting changed.
// The admin page (?admin) only affects the browser it is opened in.
export const STUDY = {
  // Set to false to show a "not accepting participants" message instead of the experiment.
  studyOpen: true,

  // Google Apps Script web app URL that receives results. Leave empty to save results by download only.
  // See docs/setup-guide.md for setup.
  uploadUrl: 'https://script.google.com/macros/s/AKfycbzQxXLqyzvXlDdz3bZTP54ZcWK6Gu3DqbfiyIQJhmNGrhgjY1QGOAMyS9AH4LHJQXDKeg/exec',

  // Participants always run this interface version with its default settings.
  interfaceVersion: 'walled-velocity',

  title: 'The Latency Threshold',
  estimatedMinutes: 12,

  // Shown above the consent checkbox. Replace with wording approved for your school or science fair.
  consentText: 'This study measures how a delay between moving the mouse and seeing the screen change affects steering accuracy. '
    + 'You will steer a ball along a path 18 times. It takes about 12 minutes. '
    + 'The app does not collect your name or contact details, only your mouse movements, results, and basic information about your computer and browser. '
    + 'You can stop at any time, and your results will be deleted. '
    + 'You must be 18 or older to take part.',
  consentCheckboxText: 'I am 18 or older, I have read this, and I agree to take part.',

  // Shown when results cannot be uploaded, so participants know where to send the downloaded file.
  contactText: 'Please send the downloaded file to the student running this study.',
};
