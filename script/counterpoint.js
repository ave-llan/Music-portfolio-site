"use strict";

// Music Dictionary
var Music = {
    noteLetters:  ['C','D','E','F','G','A','B'],
    noteIntegers: {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11},
    intervalQuality: {
        '1': { '0': 'P', '1': 'A','11': 'd'}, // 11 is for diminished octaves when calculating from the simple interval.
        '2': { '0': 'd', '1': 'm', '2': 'M', '3': 'A'},
        '3': { '2': 'd', '3': 'm', '4': 'M', '5': 'A'},
        '4': { '4': 'd', '5': 'P', '6': 'A'},
        '5': { '6': 'd', '7': 'P', '8': 'A'},
        '6': { '7': 'd', '8': 'm', '9': 'M','10': 'A'},
        '7': { '9': 'd','10': 'm','11': 'M', '0': 'A'}, // A7 is 0 instead of 12 b/c interval uses mod 12
        '8': {'11': 'd','12': 'P','13': 'A'}
    },
    intervalSemitones: {
        d1:-1, P1: 0, A1: 1, //d1 is not possible, but d8 will reduce down to d1 so this needs to be here
        d2: 0, m2: 1, M2: 2, A2: 3,
        d3: 2, m3: 3, M3: 4, A3: 5,
        d4: 4, P4: 5, A4: 6,
        d5: 6, P5: 7, A5: 8,
        d6: 7, m6: 8, M6: 9, A6:10,
        d7: 9, m7:10, M7:11, A7:12   
    },
    scales: {
        major:  ['M2','M2','m2','M2','M2','M2'],
        minor:  ['M2','m2','M2','M2','m2','M2'],
        dorian: ['M2','m2','M2','M2','M2','m2']
    },

    // returns an array with each unique note in the scale. 
    // arguments: Note tonic, array of intervals or name of common scale as a string
    scaleFrom: function(tonic, scale) {
        if (!scale || scale == "major")
            scale = Music.scales.major;
        if (scale == "minor") 
            scale = Music.scales.minor;
        if (scale == "dorian")
            scale = Music.scales.dorian;
        var newScale = [tonic];
        for (var i = 0; i < scale.length; i++) {
            newScale.push(newScale[i].plusInterval(scale[i]));
        }
        for (var i = 0; i < newScale.length; i++) {
            newScale[i] = newScale[i].pitchClass;
        }
        return newScale;
    }
};
Object.freeze(Music); // Music library is read-only

/***********************************************************************
*  Note is an immutable data type which represents a specific pitch. 
*  Note instances have the following properties:
*
*  Note.sciPitch    -- 'A4' 'C#3' 'Eb6' 'F##3' 'C0'
*  Note.pitchClass  -- 'A'  'C#'  'Eb'  'F##'  'C'
*  Note.letter      -- 'A'  'C'   'E'   'F'    'C'
*  Note.octave      --  4    3     6     3      0
*  Note.accidental  --  0    1    -1     2      0
*
*  Required input format: a string in sciPitch format as above. 
*  n.b. Letter name must be capitalized, and must have an octave number.
*
*  Note.prototype offers a number of methods:
* 
************************************************************************/
function Note(pitch) {
    // [1]= letter, [2]=accidentals [3]=octaveNum
    var pitchElements = /([A-G])(b{1,2}|#{1,2})?(\d{1,2})/.exec(pitch);
    
    // determine pitch class and accidental
    var pitchClass = pitchElements[1];                 // n.b. might still need accidental
    var accidental = 0;          
    if (pitchElements[2]){                             // if accidental...
        pitchClass += pitchElements[2]                 // add it to the letter
        if (pitchElements[2][0] === "b")
            accidental = pitchElements[2].length * -1; // flats
        else
            accidental = pitchElements[2].length;      // sharps
    }

    this.sciPitch   = pitch;
    this.pitchClass = pitchClass;
    this.letter     = pitchElements[1];
    this.octave     = Number(pitchElements[3]);
    this.accidental = accidental;
    Object.freeze(this);  // immutable 
}

Note.prototype = {
    constructor: Note,

    toString: function() {
        return this.sciPitch;
    },

    // returns a number representing absolute pitch. Also, could be MIDI number.
    absolutePitch: function() {
        var absPitch = Music.noteIntegers[this.letter] +
                       (12 * (this.octave + 1)) + 
                       this.accidental;
        return absPitch;
    },

    // returns a boolean
    equals: function(that) {
        return this.sciPitch == that.sciPitch;
    },

    // returns a boolean
    isLower: function(that) {
        return this.absolutePitch() < that.absolutePitch();
    },

    // returns a boolean
    isHigher: function(that) {
        return this.absolutePitch() > that.absolutePitch();
    },

    // returns a boolean
    isEnharmonic: function(that) {
        return this.absolutePitch() == that.absolutePitch();
    },

    // return sa boolean
    isSamePitchClass: function(that) {
        return this.pitchClass == that.pitchClass;
    },

    // returns a number, the semitones between the two Notes
    semitonesTo: function(that) {
        return Math.abs(this.absolutePitch() - that.absolutePitch());
    },

    // returns a number representing interval size. order does not matter
    intervalSize: function(that) {
        if (this.equals(that))
            return 1;
        var interval = 1;
        var lower, higher;
        if (this.isLower(that)) {
            lower = this;
            higher = that;
        }
        else {
            lower = that;
            higher = this;
        }
        var octaveDif = higher.octave - lower.octave;
        var cur = Music.noteLetters.indexOf(lower.letter);
        while (higher.letter != Music.noteLetters[cur]) {
            if (cur < 6){
            cur++;
            interval++;
            }
            else {
                cur = 0;
                interval++;
                octaveDif--; // lowPitch crossed over an octave cycle so the difference must be adjusted.
            } 
        }
        interval += 7 * octaveDif;
        return interval;
    },

    // returns a number representing the simple interval size (1-7)
    simpleIntervalSize: function(that) {
        return ((this.intervalSize(that) - 1) % 7) + 1;
    },

    // returns a string representing the interval
    interval: function(that) {
        if (this.equals(that))
            return ("P1");
        var lower, higher;
        if (this.isLower(that)) {
            lower = this;
            higher = that;
        }
        else {
            lower = that;
            higher = this;
        }
        var simpleInt = higher.simpleIntervalSize(lower);
        var halfSteps = higher.semitonesTo(lower) % 12; // simplify to an octave
        return Music.intervalQuality[simpleInt][halfSteps] + String(higher.intervalSize(lower));
    },

    // get a new Note by adding the given interval size
    // argument: interval (number), scale[] (optional)
    // return:   Note 
    plusIntervalSize: function(interval, scale) {
        var startNote = this.pitchClass;
        var octaveChange = Math.floor((interval - 1) / 7); 
        var octave = this.octave + octaveChange;
        var stepsAway = (interval - 1) % 7;  // do not add the 1 back because this is stepsAway, not interval size
        if (!scale) {                        // if scale not provided
            scale = Music.noteLetters;       // use C major 
            startNote = this.letter;         // ignore accidentals on starting note
        }
        var cur = scale.indexOf(startNote);
        while (stepsAway > 0){
            if (cur < scale.length - 1){
                cur++;
                stepsAway--;
            }
            else {                                // reached top, cycle back to tonic
                cur = 0;
                stepsAway--;
            }
            if (scale[cur].charAt(0) === "C") {   // crossed over into a new octave cycle
                octave++;
            }
        }
        return new Note(scale[cur] + String(octave));
    },

    // get a new Note by subtracting the given interval size
    // argument: interval (number), scale[] (optional)
    // return:   Note 
    minusIntervalSize: function(interval, scale) {
        var startNote = this.pitchClass;
        var octaveChange = Math.floor((interval - 1) / 7); 
        var octave = this.octave - octaveChange;
        var stepsAway = (interval - 1) % 7;  // do not add the 1 back because this is stepsAway, not interval size
        if (!scale) {                        // if scale not provided
            scale = Music.noteLetters;       // use C major 
            startNote = this.letter;         // ignore accidentals on starting note
        }
        var cur = scale.indexOf(startNote);
        while (stepsAway > 0){
            if (cur > 0){
                cur--;
                stepsAway--;
            }
            else {                                // reached tonic, cycle back to top
                cur = scale.length - 1;
                stepsAway--;
            }
            if (scale[cur].charAt(0) === "B") {   // crossed over into a new octave cycle
                octave--;
            }
        }
        return new Note(scale[cur] + String(octave));
    },

    // get a new Note by adding a given interval
    // argument interval examples: M2, m10, P4, d7, A5
    plusInterval: function(interval) {
        var intervalElements = /([dmMAP])(\d{1,2})/.exec(interval);
        var intervalQuality = intervalElements[1];
        var intervalSize = Number(intervalElements[2]);
        var octaveChange = Math.floor((intervalSize - 1) / 7);
        var newNote = this.plusIntervalSize(intervalSize);
        var simpleInterval = intervalQuality + String(this.simpleIntervalSize(newNote));
        if (!simpleInterval in Music.intervalSemitones) {
            throw new Error('Undefined Interval Argument!');
        }
        var goalHalfSteps = Music.intervalSemitones[simpleInterval] + octaveChange * 12;
        var currentHalfSteps = this.semitonesTo(newNote);  // simplify to within an octave for comparison
        var accidentalAdjust = goalHalfSteps - currentHalfSteps;
        if (accidentalAdjust == 0)
            return newNote;
        var newAccidental = "";
        if (accidentalAdjust > 0) {
            for (var i = 0; i < accidentalAdjust; i++){
                newAccidental += "#";
            }
        }
        else {                                                  // accidentalAdjust < 0
            for (var i = 0; i > accidentalAdjust; i--){
                newAccidental += "b";
            }
        }
        return new Note(newNote.letter + newAccidental + String(newNote.octave));
    },

    // get a new Note by subtracting a given interval
    // argument interval examples: M2, m10, P4, d7, A5
    minusInterval: function(interval) {
        var intervalElements = /([dmMAP])(\d{1,2})/.exec(interval);
        var intervalQuality = intervalElements[1];
        var intervalSize = Number(intervalElements[2]);
        var octaveChange = Math.floor((intervalSize - 1) / 7);
        var newNote = this.minusIntervalSize(intervalSize);
        var simpleInterval = intervalQuality + String(this.simpleIntervalSize(newNote));
        if (!simpleInterval in Music.intervalSemitones) {
            throw new Error('Undefined Interval Argument!');
        }
        var goalHalfSteps = Music.intervalSemitones[simpleInterval] + octaveChange * 12;
        var currentHalfSteps = this.semitonesTo(newNote);  // simplify to within an octave for comparison
        var accidentalAdjust = goalHalfSteps - currentHalfSteps;
        if (accidentalAdjust == 0)
            return newNote;
        var newAccidental = "";
        if (accidentalAdjust > 0) {
            for (var i = 0; i < accidentalAdjust; i++){
                newAccidental += "b";
            }
        }
        else {                                                  // accidentalAdjust < 0
            for (var i = 0; i > accidentalAdjust; i--){
                newAccidental += "#";
            }
        }
        return new Note(newNote.letter + newAccidental + String(newNote.octave));
    }

};

// helper function for sorting Notes
function noteCompare(a,b) {
  if (a.isLower(b))
     return -1;
  if (a.isHigher(b))
    return 1;
  return 0;
}


/***********************************************************************
************************************************************************/
// Species Counterpoint Library
var SpeciesCounterpoint = {
    melodicIntervals: ["m2", "M2", "m3", "M3", "P4", "P5", "m6", "M6", "P8"],
    simpleIntervals: [2, 3, 4, 5, 6, 8],
    maxRange: "M10",
    minLength: 8,
    maxLength: 16,
    // should contain 2-4 leaps greater than a third
    minLeaps: 2,
    maxLeaps: 4,
    maxStepwiseMotion: 5
};
Object.freeze(SpeciesCounterpoint);

/***********************************************************************
*  CantusFirmus takes an array of Notes representing a cantus firmus and provides analysis. 
*  
*  Required Arguments: Note tonic, String[] scale
*  Optional Arguments: Note climax, Int climaxLocation, Int length, Int range
*
* 
************************************************************************/

function CantusFirmus(cf, scale) {
    // if no arguments, assume C major
    if (arguments.length == 0) {
        cf = [];
        scale = Music.noteLetters;
    }
    this.cf = cf;
    this.scale = scale;
    this.leadingTone = this.cf[0].plusInterval("M7");
    if (this.length() <= 1)
        this.rank = 0;
    else this.rank = this.ranking();
}

//TODO: toString, errorCheck
CantusFirmus.prototype = {
    constructor: CantusFirmus,

    toString: function() {
        var notes = "cf: [";
        if (this.length() > 0)
            notes += this.cf[0];
        for (var i = 1; i < this.length(); i++) {
            notes += " " + this.cf[i];
        }
        notes += "]";
        return notes;
    },

    length: function() {
        return this.cf.length;
    },

    // returns a NEW array with cf notes in sorted order from low to high
    sort: function() {
        var sorted = [];
        // copy cf to new array for sorting
        for (var i = 0; i < this.length(); i++) {
            sorted.push(this.cf[i]);
        }
        return sorted.sort(noteCompare);
    },

    // returns the lowest Note
    lowNote: function() {
        return this.sort()[0];
    },

    highNote: function() {
        return this.sort()[this.length() - 1];
    },

    // 
    range: function() {
        return this.lowNote().interval(this.highNote());
    },

    // returns the index number of the climax
    // returns only the first occurance if climax is repeated
    findClimax: function() {
        for (var i = 0; i < this.length(); i++) {
            if (this.cf[i].equals(this.highNote()))
                return i;
        }
    },

    // returns an array with all unique notes used in CF
    uniqueNotes: function() {
        var sorted = this.sort();
        var uniques = [sorted[0]];
        for (var i = 1; i < sorted.length; i++) {
            if (!sorted[i].equals(sorted[i - 1]))
                uniques.push(sorted[i]);
        }
        return uniques;
    },

    // returns the number of leaps larger than 4
    leapCount: function() {
        var leaps = 0;
        if (this.length() > 1) {
            for (var i = 1; i < this.length(); i++) {
                if (this.cf[i-1].intervalSize(this.cf[i]) > 3)
                    leaps++;
            }
        }
        return leaps;
    },

    // returns an object with sciPitch strings as properties, each holding a number indicating its frequency
    noteFrequency: function() {
        var notes = {};
        var sorted = this.sort();
        var count = 0;
        for (var i = 0; i < sorted.length; i++) {
            if (!(sorted[i].sciPitch in notes)) {
                notes[sorted[i].sciPitch] = 1;
                count++;
            }
            else {
                notes[sorted[i].sciPitch]++;
            }
        }
        var mean = this.length() / count;
        var variance = 0;
        for (var note in notes) {
            variance += Math.pow(notes[note] - mean, 2);
        }
        variance /= count;
        notes.variance = variance;
        notes.stdDeviation = Math.sqrt(variance);
        Object.defineProperty(notes, "variance", {enumerable: false });
        notes.stdDeviation = Math.sqrt(variance);
        Object.defineProperty(notes, "stdDeviation", {enumerable: false });
        notes.count = count;
        Object.defineProperty(notes, "count", {enumerable: false });
        notes.mean = mean;
        Object.defineProperty(notes, "mean", {enumerable: false });
        return notes;
    },

    //  subjective version of noteFrequency which gives extra 'points' to notes that followed large leaps
    noteWeights: function() {
        var noteWeights = this.noteFrequency();
        // leaps larger than 4 get extra weight of square root of simple interval - 1.75
        // 4 = 0.25;  5 = 0.49; 6 = 0.699; 8 = 1.078
        for (var i = 1; i < this.length(); i++) {
            var intervalSize = this.cf[i].intervalSize(this.cf[i-1]);
            if (intervalSize > 3) {
                noteWeights[this.cf[i].sciPitch] += Math.sqrt(intervalSize) - 1.75;
            }
        }
        // Add 1 to climax note if cf is already 8 notes long
        // TODO think about what extra weight climax should get
        if (this.length() >= 8) {
            noteWeights[this.highNote().sciPitch] += 1;
            // if lowNote is lower than starting note, also give it extra weight
            if (this.lowNote().isLower(this.cf[0])) {
                noteWeights[this.lowNote().sciPitch] += 1;
            }
        }

        // calculate new mean for note weight
        var total = 0;
        for (var note in noteWeights) {
            total += noteWeights[note];
        }
        noteWeights.mean =  total / noteWeights.count;
        // calculate new standard deviation for note weight
        var variance = 0;
        for (var note in noteWeights) {
            variance += Math.pow(noteWeights[note] - noteWeights.mean, 2);
        }
        variance /= noteWeights.count;
        noteWeights.variance = variance;
        noteWeights.stdDeviation = Math.sqrt(variance);
        return noteWeights;
    },
    
    // returns an array of note arrays with all melodic outlines in CF
    melodicOutlines: function() {
        // first, find all pairs of notes that change direction
        var directionChanges = [0]; // all direction changes plus first and last notes
        var previousDirection = this.cf[0].isLower(this.cf[1]);
        for (var i = 2; i < this.length(); i++) {
            var direction = this.cf[i - 1].isLower(this.cf[i]);
            if (direction !== previousDirection) {
                // add i - 1 twice because it is both the end and the beginning of an outline
                directionChanges.push(i - 1, i - 1);
                previousDirection = direction;
            }
        }
        directionChanges.push(this.length() - 1); // add last note

        // now, build output arrays using directionChange indices
        var melodicOutlines = [];
        for (var i = 0; i < directionChanges.length; i += 2) {
            var outline = [];
            for (var j = directionChanges[i]; j <= directionChanges[i+1]; j++) {
                outline.push(this.cf[j]);
            }
            melodicOutlines.push(outline);
        }
        return melodicOutlines;
    },

    // returns an object with stats on the melodic outline lengths 
    // includes count, mean, stdDeviation, and variance
    melodicShapeStats: function() {
        var melodicOutlines = this.melodicOutlines();
        var stats = {};
        stats.count = melodicOutlines.length;
        var total = 0;
        for (var i = 0; i < melodicOutlines.length; i++) {
            total += melodicOutlines[i].length;
        }
        stats.mean = total / stats.count;

        var variance = 0;
        for (var i = 0; i < melodicOutlines.length; i++) {
            variance += Math.pow(melodicOutlines[i].length - stats.mean, 2);
        }
        variance /= stats.count;
        stats.variance = variance;
        stats.stdDeviation = Math.sqrt(variance);
        return stats;
    },

    intervalStats: function() {
        var intervals = {};
        if (this.length() > 1);
        for (var i = 1; i < this.length(); i++) {
            var interval = String(this.cf[i].intervalSize(this.cf[i-1]));
            if (!(interval in intervals))
                 intervals[interval] = 1;
            else intervals[interval]++;
        }
        return intervals;
    },

    directionStats: function() {
        var directions = {
            up: 0,
            down: 0,
            tied: 0
        };
        if (this.length() > 1);
        for (var i = 1; i < this.length(); i++) {
            if (this.cf[i].isLower(this.cf[i-1]))
                directions.down++;
            else if (this.cf[i].isHigher(this.cf[i-1]))
                directions.up++;
            else directions.tied++;
        }
        return directions;
    },

    /*
    // returns a string describing any errors found
    errorCheck: function() {
        var errors = [];

        // check start and end on same note
        if (!this.cf[0].equals(this.cf[this.length - 1])) {
            errors.push("Cantus Firmus must end on tonic (" + this.cf[0] + ").\nCurrent last note is " + 
                        this.cf[this.length - 1] + ".");
        }

        // check length of cantus firmus
        if (this.length < SpeciesCounterpoint.minLength) {
            errors.push("Cantus Firmus must be at least " + 
                        SpeciesCounterpoint.minLength + " notes long.\nCurrent length is " + 
                        this.length + ".");
        }
        if (this.length > SpeciesCounterpoint.maxLength) {
            errors.push("Cantus Firmus cannot be more than " + 
                        SpeciesCounterpoint.maxLength + " notes long.\nCurrent length is " + 
                        this.length + ".");
        }

        // check range
        // TODO should really make an interval data type... this is a confusing workaround
        if (this.highNote.isHigher(this.lowNote.plusInterval(SpeciesCounterpoint.maxRange))) {
            errors.push("Range cannot be greater than a " + SpeciesCounterpoint.maxRange + ".\nCurrent Range is " + 
                        this.range);
        }

        // check if climax note is repeated
        if (this.highNote.equals(this.sorted[this.length - 2])) {
            var timesRepeated = 0;
            // high note should be .length - 1, so repeated high notes start at .length -2
            while (this.highNote.equals(this.sorted[this.length - 2 - timesRepeated]) 
                   && this.length - 2 - timesRepeated >= 0) {
                timesRepeated++;
            }
            errors.push("Climax note cannot be repeated.\nCurrent highest note (" + 
                        this.highNote + ") is used " + (timesRepeated + 1) + " times.");
        }

        // check all melodic intervals
        for (var i = 1; i < this.length; i++) {
            var interval = this.cf[i - 1].interval(this.cf[i]);
            if (SpeciesCounterpoint.melodicIntervals.indexOf(interval) == -1) {
                errors.push("Dissonant melodic interval (" + interval + ") from " + 
                            this.cf[i - 1] + " to " + this.cf[i] + ".");
            }
        }

        // check melodic outlines for dissonant intervals
        var outlines = this.melodicOutlines();
        for (var i = 0; i < outlines.length; i++) {
            if (outlines[i].length > 2) {
                var endOutline = outlines[i].length - 1;
                var interval = outlines[i][0].interval(outlines[i][endOutline]);
                if (SpeciesCounterpoint.melodicIntervals.indexOf(interval) == -1) {
                    var outlineNotes = "";
                    for (var j = 0; j < outlines[i].length; j++) {
                        outlineNotes += outlines[i][j];
                        outlineNotes += " ";
                    }
                    errors.push(outlineNotes + " outline a dissonant interval (" + interval + ").");
                }
            }
        }

        // check length of melodic outlines
        // check for stepwise recovery after leaps

        // format all errors in a single string
        if (errors.length == 0)
            return "No errors found!";
        var errorReport = String(errors.length) + " potential errors found in " + this.toString() + ":";
        for (var i = 0; i < errors.length; i++) {
            errorReport += "\n\n" + "Error " + (i + 1) + ":\n";
            errorReport += errors[i];
        }
        return errorReport;
    },
    */

    // returns an array of possible next notes
    // TODO shuffle results before returning
    nextNoteChoices: function() {
        var noteChoices = [];
        var scale = this.scale;
        var leadingTone = this.leadingTone;

        // if cf is empty, start with tonic (arbitrarily choose octave 4)
        if (this.length() == 0) {
            noteChoices.push(new Note(this.scale[0] + "4"));
            return noteChoices;
        }
        var lastNote = this.cf[this.length() - 1];             // defined for convenience
        console.log("\n\n ______________________________________________\nNext Choice Considerations for current cf:\n" + this);
        console.log("   last note: " + lastNote);
        var goUp = function() {
            var ascend = Note.prototype.plusIntervalSize.bind(lastNote);
            for (var i = 0; i < arguments.length; i++) {
                var newNote = ascend(arguments[i], scale);
                if (newNote.isSamePitchClass(leadingTone) && arguments[i] > 3)
                    continue;   // do not leap to to the leading tone 
                // if interval is not dissonant
                if (SpeciesCounterpoint.melodicIntervals.indexOf(lastNote.interval(newNote)) != -1) {
                    noteChoices.push(newNote);
                }
            }
        };

        var goDown = function() {
            var descend = Note.prototype.minusIntervalSize.bind(lastNote);
            for (var i = 0; i < arguments.length; i++) {
                var newNote = (descend(arguments[i], scale));
                if (newNote.isSamePitchClass(leadingTone) && arguments[i] > 3)
                    continue;   // do not leap to to the leading tone 
                // if interval is not dissonant
                if (SpeciesCounterpoint.melodicIntervals.indexOf(lastNote.interval(newNote)) != -1) {
                    noteChoices.push(newNote);
                }
            }
        };

        // if cf has only one note, return all possible choices
        if (this.length() === 1) {
            console.log("...cf has only one note.");
              goUp(2, 3, 4, 5, 6, 8);
            goDown(2, 3, 4, 5, 6, 8);
        }
        
        else {
            var secondToLastNote = this.cf[this.length() - 2];    // defined for convenience
            var ASCENDING = true;
            var previousDirection = secondToLastNote.isLower(lastNote);
            var lastIntervalSize = secondToLastNote.intervalSize(lastNote);

            // if proceeded by leap > 3, change direction and move 2 or 3 to recover from leap
            if (lastIntervalSize > 3) {
                console.log("...proceeded by leap, must change direction.");
                if (previousDirection == ASCENDING) {   
                    goDown(2, 3);
                }
                else  {                                 
                      goUp(2, 3);
                }
            }
    
            
            else {
                // find last melodic outline
                var melodicOutline = [secondToLastNote, lastNote];
                for (var i = this.length() - 3; i >= 0; i--) {
                    if (this.cf[i].isLower(melodicOutline[0]) != previousDirection)
                        break; // direction changed
                    melodicOutline.unshift(this.cf[i]);
                }
                console.log("   melodic outline: " + melodicOutline);
                var outlinedInterval = lastNote.interval(melodicOutline[0]);
                var outlinedIntervalSize = lastNote.intervalSize(melodicOutline[0]);
                var directionChangePossible = SpeciesCounterpoint.melodicIntervals.indexOf(outlinedInterval) > -1;

                // if last interval was 3 or 4, only move by step

                // call whenever not proceeded by leap & directionChangePossible = true
                var tryChangeDirection_AddAllNotes = function() {
                    if (directionChangePossible) {
                        if (lastIntervalSize == 3) {             // to avoid outlining triads and repeating leap
                            if (previousDirection == ASCENDING)
                                goDown(2, 4, 8);
                            else  goUp(2, 4, 8);
                        }
                        else if (lastIntervalSize == 4) {
                            if (previousDirection == ASCENDING)  // to avoid outlining triads and repeating leap
                                goDown(2, 3, 5, 8);
                            else  goUp(2, 3, 5, 8);
                        }
                        else if (previousDirection == ASCENDING) // previous interval was 2, add all notes
                            goDown(2, 3, 4, 5, 6, 8);
                        else  goUp(2, 3, 4, 5, 6, 8);
                    }   
                };

                // helper functions that won't add notes if outline would be larger than 8 
                // and only moves by step if last interval was 3 or 4
                goUp.findChoices = function() {
                    var choices = [2];                  // only moves by step if last interval was 3 or 4
                    if (lastIntervalSize == 2) {
                        if (melodicOutline.length > 2) // if already moving in same direction for more than two notes, no big leaps
                            choices.push(3);
                        else choices.push(3, 4, 5);
                    }
                    for (var i = 0; i < choices.length; i++) {
                        // -1 from argument size because this should be # of additional steps moved (6th + 3rd = 8)
                        if (outlinedIntervalSize + choices[i] - 1 <= 8) {
                            if (choices[i] == 2)
                                goUp(choices[i]);
                            else {
                                // do not leap into a note dissonant with start of outline
                                var accentedInterval = melodicOutline[0].interval(lastNote.plusIntervalSize(choices[i], scale));
                                if (SpeciesCounterpoint.melodicIntervals.indexOf(accentedInterval) > -1)
                                    goUp(choices[i]);
                            }
                        }
                    }                    
                };
                goDown.findChoices = function() {
                    var choices = [2];                  // only moves by step if last interval was 3 or 4
                    if (lastIntervalSize == 2) {
                        if (melodicOutline.length > 2) // if already moving in same direction for more than two notes, no big leaps
                            choices.push(3);
                        else choices.push(3, 4, 5);
                    }
                    for (var i = 0; i < choices.length; i++) {
                        // -1 from argument size because this should be # of additional steps moved (6th + 3rd = 8)
                        if (outlinedIntervalSize + choices[i] - 1 <= 8) {
                            if (choices[i] == 2)
                                goDown(choices[i]);
                            else {
                                // do not leap into a note dissonant with start of outline
                                var accentedInterval = melodicOutline[0].interval(lastNote.minusIntervalSize(choices[i], scale));
                                if (SpeciesCounterpoint.melodicIntervals.indexOf(accentedInterval) > -1)
                                    goDown(choices[i]);
                            }
                        }
                    }     
                };

                // if length >= 5, change direction and add all possible intervals
                if (melodicOutline.length >= 5) {
                    console.log("...melodic outline longer than five, so must change direction");
                    // if melodic outline currently forms a dissonance, this is a dead end because we must change direction
                    if (!directionChangePossible) {
                        noteChoices = [];    // make sure noteChoices is empty and return it
                        return noteChoices; 
                    }
                    else tryChangeDirection_AddAllNotes();
                }

                // if length < 5 
                else {
                    // first, add notes from direction change if possible
                    tryChangeDirection_AddAllNotes();
                    // try to continue in same direction by step or third. Cannot leap at this point.
                    if (previousDirection == ASCENDING)
                           goUp.findChoices();
                    else goDown.findChoices();
                }
            }
        }
        console.log("NOTE CHOICES: " + noteChoices + "\n");
        return noteChoices;      
    },

    // Higher number is better. Used in max priortiy Queue to determine which route to explore next.
    ranking: function() {
        var score = 0;
        var cfLength = this.length();

        // +0.1 for length so further along have higher priority
        score += cfLength * 0.1;

        // +0.5 for each unique note used
        score += this.uniqueNotes().length * 1;

        // 2-4 leaps larger than M3

        // bonus for high standard deviation of melodic outline length
        score += 6 * this.melodicShapeStats().stdDeviation;


        // penalty for high standard deviation of note weight
        if (cfLength > 6) {
            score -= this.noteWeights().stdDeviation;
        }

        // penalty for too many or too few leaps
        var leaps = this.leapCount();
        if (leaps > 4) {        // -1 for each extra leap
            score -= leaps - 4;
        }
        else if (cfLength >= 5) {
            var deduction = leaps - cfLength/4; // 2-4 leaps for cf of 8-16 length
            if (deduction < 0) // no bonus added if this number is positive
                score += deduction;
        }

        // penalty for too few or too many seconds and more than one octave
        var intervals = this.intervalStats();
        // penalty if seconds are not at least 54% of intervals
        if (cfLength > 5) {
            console.log(intervals);
            var desiredSeconds = (cfLength - 1) / 1.85;
            if (intervals["2"] < desiredSeconds)
                score -= desiredSeconds - intervals["2"];
        }

        if ("8" in intervals) {
            // subtract a point for having more than one octave leap
            score -= intervals["8"] - 1;
        }

        // if range = 8, once 
        var rangeSimpleInterval = this.lowNote().intervalSize(this.highNote());
        if (rangeSimpleInterval < cfLength && cfLength > 5) {
            score -= rangeSimpleInterval - this.uniqueNotes().length;
        }

        // directions should be relatively balanced
        if (cfLength > 6) {
            var directions = this.directionStats();
            var offBalance = Math.abs(directions.up - directions.down) - 2;
            score -= offBalance * (cfLength / 8);
        }


        // add an element of chance?
        //score += Math.random();
        return score;
    }

}

/***********************************************************************
*  cfBuilder takes an array of Notes representing a cantus firmus and provides analysis. 
*  
*  Required Arguments: Note tonic, String[] scale
*  Optional Arguments: Note climax, Int climaxLocation, Int length, Int range
*
************************************************************************/
function CFbuilder(startingCF, goalLength, climaxNote, climaxLocation, maxRange) {
    var start = Date.now();
    // if no starting CF, randomly choose a tonic and mode
    if (!startingCF) {
        var noteChoices = ["G4", "F4", "A4"];
        var tonic = new Note(noteChoices[Math.floor(Math.random() * noteChoices.length)]);
        var modeChoices = ["major", "minor", "dorian"];
        var mode = modeChoices[Math.floor(Math.random() * modeChoices.length)];
        startingCF = new CantusFirmus([tonic], Music.scaleFrom(tonic, mode));
    }
    // if no goalLength, randomly chose a goal 
    if (!goalLength) {
        goalLength = 8 + Math.floor(Math.random() * 9); // 8-16 
    }
    var climaxInterval; // used later to determine climax Location
    if (!climaxNote) {
        var minClimax = 2;
        var maxClimax = 8;
        if (goalLength == 8)
            maxClimax = 6;
        climaxInterval = minClimax + Math.floor(Math.random() * (maxClimax - minClimax));
        if (climaxInterval == 7 && startingCF.cf[0].plusInterval("M7").equals(startingCF.cf[0].plusIntervalSize(7, startingCF.scale))) {
            climaxInterval = minClimax + Math.floor(Math.random() * (6 - minClimax));;   // if 7 is the leading tone, chose again from 2-6
        }
        console.log("StartingCF = " + startingCF);
        console.log("climaxInterval = " + climaxInterval);
        climaxNote = startingCF.cf[0].plusIntervalSize(climaxInterval, startingCF.scale);
        if (climaxInterval == 2)
            climaxLocation = goalLength - 2;   // if climaxInterval is 2, it must be the penultimate note
    }
    if (!climaxLocation) {
        var startOffset = 1;
        var endOffset = 3;
        if (climaxInterval >= 7) {
            startOffset++;
            endOffset++;
        }
        if (climaxInterval > 4) {
            endOffset++;
        }
        climaxLocation = startOffset + Math.floor(Math.random() * (goalLength - endOffset)); // position 1 - (length-4)
    }
    if (!maxRange) {
        var minPossibleRange = climaxInterval;   // range must be at least large enough to get to the climax
        var maxPossibleRange = 10;
        if (climaxInterval < 5)                  
            minPossibleRange = 5;                // minimum range of 5
        maxRange = minPossibleRange + Math.floor(Math.random() * (maxPossibleRange - minPossibleRange));
    }
    this.cf = startingCF;
    this.goalLength = goalLength;
    this.climaxLocation = climaxLocation;
    this.maxRange = maxRange;
    this.maxNote = climaxNote;
    this.minNote = climaxNote.minusIntervalSize(maxRange, this.cf.scale);
    // build the cantus firmus!
    this.buildCF();


    var end = Date.now();
    var elapsedTime = (end - start) / 1000;
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log("Built CF in " + elapsedTime + " seconds.");
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
}

CFbuilder.prototype = {
    constructor: CFbuilder,

    // comparator function used in MaxPQ
    cfRankIsLess: function(i, j) {
        return i.rank < j.rank;
    },

    // returns a new CantusFirmus with the given note added
    addNote: function(currentCF, newNote) {
        var notes = [];
        for (var i = 0; i < currentCF.length(); i++) {
            notes.push(currentCF.cf[i]);
        }
        notes.push(newNote);
        return new CantusFirmus(notes, currentCF.scale);
    },

    // returns a boolean, TRUE if the given note is an option as a next note in the given cf
    isNotePossible: function(currentCF, candidate) {
        var nextNotes = currentCF.nextNoteChoices();
        for (var i = 0; i < nextNotes.length; i++) {
            if (candidate.equals(nextNotes[i]))
                return true;
        }
        return false;
    },

    buildCF: function() {
        var cfPQ = new MaxPQ(this.cfRankIsLess);                          // put routes to climax here, then pass this to composeToEnd
        // if climax is penultimate note, only call composeToEnd
        if (this.climaxLocation == this.goalLength - 2) {
            cfPQ.insert(this.cf);
            this.composeToEnd(cfPQ);
        }
        else {
            this.composeTo(this.maxNote, this.climaxLocation, cfPQ);
            this.composeToEnd(cfPQ);
        }
    },

    // insert resulting cfs into the pqDeposit
    composeTo: function(goalNote, goalNotePosition, pqDeposit) {
        var pq = new MaxPQ(this.cfRankIsLess);                            // private priority queu holding possible cfs
        var foundCount = 0;
        var numberToFind = 10;
        pq.insert(this.cf);
        var currentCF = this.cf;
        // currentCF.length() <= goalNotePosition && 
        while (!pq.isEmpty() && foundCount < numberToFind) {
            currentCF = pq.delMax();
            var nextNotes = currentCF.nextNoteChoices();
            // testing
            console.log("CurrentCF: " + currentCF);
            console.log("Priority = " + currentCF.rank);
            console.log("Next Note Choices: " + nextNotes);
            // end testing
            if (nextNotes.length == 0)                                    // dead end
                continue;
            // if only the goal note is missing, check to see if this is the solution
            if (currentCF.length() == goalNotePosition) {
                console.log("...checking if goal is found...");
                if (this.isNotePossible(currentCF, goalNote)) {
                    currentCF = this.addNote(currentCF, goalNote);        // add the goal note -- now done!
                    pqDeposit.insert(currentCF);
                    foundCount++;
                    console.log("RESULT FROM THIS SEARCH: CF: " + currentCF);
                    console.log("Priority = " + currentCF.rank);
                }
                continue;                                                 // dead end OR if solution found, this will break out of the while loop
            }
            shuffleArray(nextNotes);                                      // randomize order of insertion
            console.log("Shuffled Choices: " + nextNotes);
            for (var i = 0; i < nextNotes.length; i++) {
                var newNote = nextNotes[i];
                // if newNote < maxNote && newNote >= minNote
                if (newNote.isLower(this.maxNote) && (newNote.isHigher(this.minNote) || newNote.equals(this.minNote))) {
                    pq.insert(this.addNote(currentCF, newNote));
                }
            }
        }
        this.cf = currentCF;
        return currentCF;
    },

    // same as composeTo, but goal is to reach a 2 - 1 at end
    composeToEnd: function(pq) {
        var goalNotePosition = this.goalLength - 2;                       // position of the penultimate note, scale degree 2
        var goalNote = this.cf.cf[0].plusIntervalSize(2, this.cf.scale);  // scale degree 2
        var tonic = this.cf.cf[0];                                        // scale degree 1
        //var pq = new MaxPQ(this.cfRankIsLess);                            // private priority queu holding possible cfs
        //pq.insert(this.cf);
        var currentCF = this.cf;
        while (currentCF.length() < this.goalLength && !pq.isEmpty()) {
            currentCF = pq.delMax();
            var nextNotes = currentCF.nextNoteChoices();
            // testing
            console.log("");
            console.log("CurrentCF: " + currentCF);
            console.log("Priority = " + currentCF.rank);
            console.log("Next Note Choices: " + nextNotes);
            // end testing
            if (nextNotes.length == 0)                                    // dead end
                continue;
            // if only the goal note is missing, check to see if this is the solution
            if (currentCF.length() == goalNotePosition) {
                console.log("checking if end is found!");
                if (this.isNotePossible(currentCF, goalNote)) {
                    currentCF = this.addNote(currentCF, goalNote);        // add penultimate note
                    console.log("Adding penultimate note!");
                    console.log("CurrentCF: " + currentCF);
                    console.log("Priority = " + currentCF.rank);
                    if (this.isNotePossible(currentCF, tonic)) {          // check if tonic works
                        currentCF = this.addNote(currentCF, tonic);       // add tonic -- now done!
                        console.log("***************************");
                        console.log("Resulting CF: " + currentCF);
                        console.log("Priority = " + currentCF.rank);
                    }
                }
                continue;                                                 // dead end OR if solution found, this will break out of the while loop
            }
            shuffleArray(nextNotes);                                      // randomize order of insertion
            console.log("Shuffled Choices: " + nextNotes);
            for (var i = 0; i < nextNotes.length; i++) {
                var newNote = nextNotes[i];
                // if newNote < maxNote && newNote >= minNote
                if (newNote.isLower(this.maxNote) && (newNote.isHigher(this.minNote) || newNote.equals(this.minNote))) {
                    pq.insert(this.addNote(currentCF, newNote));
                }
            }
        }
        this.cf = currentCF;
        return currentCF;
    }

}


/************************************************************************
*  javascript adaptation of a Max Priority Queue from
*  Algorithms (4th edition) by Robert Sedgewick and Kevin Wayne
************************************************************************/

function MaxPQ(lessComparator) {
    this.pq = [];                  // heap-ordered binary tree
    this.N = 0;                    // number of items in priority queue
    // function(i, j) used to compare two keys.  Must answer the question, is i less than j?
    this.isLess = lessComparator;    
}

MaxPQ.prototype = {
    constructor: MaxPQ,

    isEmpty: function() {
        return this.N == 0;
    },

    size: function() {
        return this.N;
    },

    // add new item to the pq
    insert: function(v) {
        this.N++;
        this.pq[this.N] = v;
        this.swim(this.N);
    },

    // deletes and returns the max key
    delMax: function() {
        this.exch(1, this.N);
        var max = this.pq.pop(this.N);
        this.N--;
        this.sink(1);
        return max;
    },

    // TODO helper functions (how do I make these private?)

    // compare the items at indices i and j
    less: function(i, j) {
        return this.isLess(this.pq[i], this.pq[j]);
    },

    // exchange two items in the priority queue
    exch: function(i, j) {
        var t = this.pq[i];
        this.pq[i] = this.pq[j];
        this.pq[j] = t;
    },


    swim: function(k) {
        while (k > 1 && this.less(Math.floor(k/2), k)) {
            this.exch(Math.floor(k/2), k);
            k = Math.floor(k/2);
        }
    },

    sink: function(k) {
        while (2*k <= this.N) {
            var j = 2*k;
            if (j < this.N && this.less(j, j+1))  // choose the larger of k's children
                j++;
            if (!this.less(k, j))            // k is now in the correct position
                break;
            this.exch(k, j);
            k = j;
        }
    }
}

// randomly shuffle the elements in an array
function shuffleArray(a) {
    for (var i = 0; i < a.length; i++) {
        var r = i + Math.floor(Math.random() * (a.length - i));
        var temp = a[i];
        a[i] = a[r];
        a[r] = temp;
    }
}

// returns a Vex.Flow.StaveNote whole note
function translateToVexNote(note) {
    var duration = "w" // all whole notes for now
    var keys = note.pitchClass.toLowerCase() + "/" + note.octave;
    var vexNote;
    if (note.accidental === 0) {
        vexNote = new Vex.Flow.StaveNote({ keys: [keys], duration: duration});
    }
    else {
        var pitchElements = /([A-G])(b{1,2}|#{1,2})/.exec(note.pitchClass);
        var accidental = pitchElements[2];
        vexNote = new Vex.Flow.StaveNote({ keys: [keys], duration: duration}).
            addAccidental(0, new Vex.Flow.Accidental(accidental));
    }
    return vexNote;
}

function displayVexflow(cf) {
    var clef = "treble";
    var canvas = document.body.getElementsByTagName("canvas")[0];
    var canvasWidth = canvas.scrollWidth; 
    console.log("SCROLL WIDTH = " + canvasWidth);
    var renderer = new Vex.Flow.Renderer(canvas,
    Vex.Flow.Renderer.Backends.CANVAS);

    var ctx = renderer.getContext();
    var stave = new Vex.Flow.Stave(10, 0, canvasWidth - 20);
    stave.addClef(clef).setContext(ctx).draw();
    var notes = [];
    for (var i = 0; i < cf.length(); i++) {
        notes.push(translateToVexNote(cf.cf[i]));
    }
    var voice = new Vex.Flow.Voice({
        num_beats: cf.length(),
        beat_value: 1,
        resolution: Vex.Flow.RESOLUTION
    });
    // Add notes to voice
    voice.addTickables(notes);
    // Format and justify the notes to 600 pixels
    var formatter = new Vex.Flow.Formatter().
    joinVoices([voice]).format([voice], canvasWidth - 60);
    // Render voice
    voice.draw(ctx, stave);
}


var cantusForDisplay = new CFbuilder();
displayVexflow(cantusForDisplay.cf);










var Bb3 = new Note("Bb3");
var C4  = new Note("C4");
var D4  = new Note("D4");
var E4  = new Note("E4");
var F4  = new Note("F4");
var G4  = new Note("G4");
var GMajor = Music.scaleFrom(G4, "major");
console.log("G major is " + GMajor);
console.log("Note down a 5th in G major from C is " + C4.minusIntervalSize(5, GMajor));

/*
var myCF = [D4, E4, F4, C4, D4, F4, E4, G4, Bb3, C4, F4, E4, D4];
var badCF = [D4, E4, Bb3, G4, C4, E4, D4, C4, Bb3, D4];




var testCF = new CantusFirmus([D4, E4, F4, G4, Bb3], Music.scaleFrom(D4, "minor"));
// var testCF = new CantusFirmus(myCF, Music.scaleFrom(D4, "minor"));

console.log(testCF);
//length sort lowNote highNote range findClimax
console.log("toString: " + testCF.toString());
console.log("sort: " + testCF.sort());
console.log("lowNote: " + testCF.lowNote());
console.log("highNote: " + testCF.highNote());
console.log("range: " + testCF.range());
console.log("findClimax: " + testCF.findClimax());
console.log("leapCount: " + testCF.leapCount());
console.log("uniqueNotes: " + testCF.uniqueNotes());
console.log("noteFrequency: ");
console.log(testCF.noteFrequency());
console.log("Note weights:");
console.log(testCF.noteWeights());
console.log("melodicShapeStats:");
console.log(testCF.melodicShapeStats());
console.log("this.ranking() : " + testCF.ranking());
console.log("this.rank:  " + testCF.rank);



// test maxPQ
function noteLessComparator(i, j) {
    return i.absolutePitch() < j.absolutePitch();
}

var tonic = new Note("Bb3");
var D3 = new Note("D3");
var Eb4 = new Note("Eb4");
var A3 = new Note("A3");
var G3 = new Note("G3");
var F3 = new Note("F3");
var Eb3 = new Note("Eb3");
var G4 = new Note("G4");
var C5 = new Note("C5");
var A4 = new Note("A4");

/*
var oneNoteCF = new CantusFirmus([tonic, G4, F4], Music.scaleFrom(tonic, "major"));
console.log("*****************************")
console.log(oneNoteCF.toString());
var nextNotes = oneNoteCF.nextNoteChoices();
console.log(nextNotes.length);
console.log("" + nextNotes);



// function CFbuilder(startingCF, length, climaxNote, climaxLocation, maxRange)
var startingCF = new CantusFirmus([D4], Music.scaleFrom(D4, "minor"));
var builder = new CFbuilder(startingCF, 13, G4, 7, 6);
displayVexflow(builder.cf);
var myVersion = new CantusFirmus([D4, E4, F4, C4, D4, F4, E4, G4, Bb3, C4, F4, E4, D4], Music.scaleFrom(D4, "minor"));
console.log("My solution: " + myVersion);
console.log("Priority: " + myVersion.rank);


/*
for (var i = 1; i < 2; i*=2) {
    var start = Date.now();
    for (var j = i; j > 0; j--) {
        var randomBuilder = new CFbuilder();
    }
    var end = Date.now();
    var elapsedTime = (end - start) / 1000;
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log("Built " + i + " CFs in " + elapsedTime + " seconds.");
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
}
*/

