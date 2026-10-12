.pragma library

var MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
}

function pad(n) {
    return String(n).padStart(2, "0")
}

function todayIso() {
    var d = new Date()
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate())
}

function formatGameTime(seconds) {
    if (!isFinite(seconds) || seconds < 0)
        return "Draft"
    var s = Math.floor(seconds)
    var h = Math.floor(s / 3600)
    var m = Math.floor((s % 3600) / 60)
    var sec = s % 60
    var mm = pad(m)
    var ss = pad(sec)
    if (h > 0)
        return h + ":" + mm + ":" + ss
    return m + ":" + ss
}

// Just finished is a few days, not a qualifier that ended in the spring.
var RECENT_DAYS = 3

function daysBetween(today, date) {
    var a = Date.parse(today + "T00:00:00Z")
    var b = Date.parse(date + "T00:00:00Z")
    if (!isFinite(a) || !isFinite(b))
        return NaN
    return Math.round((b - a) / 86400000)
}

function whenLabel(section, today, start, end) {
    if (section === "completed" || section === "past")
        return "Finished"
    if (section === "ongoing") {
        var left = daysBetween(today, end)
        if (!isFinite(left) || left < 0)
            return "Finished"
        if (left === 0)
            return "Ends today"
        if (left === 1)
            return "Ends tomorrow"
        return "Ends in " + left + " days"
    }
    var until = daysBetween(today, start)
    if (!isFinite(until) || until < 0)
        return "Started"
    if (until === 0)
        return "Starts today"
    if (until === 1)
        return "Tomorrow"
    return "In " + until + " days"
}

function monthDay(label) {
    var match = String(label || "").trim().match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/)
    if (!match)
        return null
    var month = MONTHS[match[1].slice(0, 3).toLowerCase()]
    if (month === undefined)
        return null
    var day = Number(match[2])
    if (!(day >= 1 && day <= 31))
        return null
    return { month: month, day: day }
}

function isoDate(year, month, day) {
    return year + "-" + pad(month + 1) + "-" + pad(day)
}

function addYears(iso, count) {
    return String(Number(iso.slice(0, 4)) + count) + iso.slice(4)
}

// Upcoming month-days that already passed this year belong to next year.
// Ongoing and finished events have already started, so a month-day still
// ahead on the calendar is last year. That stops a February qualifier,
// still sitting in the wiki's ongoing list in October, from being filed
// as next January and shown as live.
function resolveStart(parts, today, section) {
    if (!parts)
        return ""
    var iso = isoDate(Number(today.slice(0, 4)), parts.month, parts.day)
    if (section === "upcoming") {
        if (iso < today)
            return addYears(iso, 1)
        return iso
    }
    if (iso > today)
        return addYears(iso, -1)
    return iso
}

function resolveEnd(parts, start, today, section) {
    if (!parts)
        return ""
    var year = start ? Number(start.slice(0, 4)) : Number(today.slice(0, 4))
    var iso = isoDate(year, parts.month, parts.day)
    if (start && iso < start)
        iso = addYears(iso, 1)
    if (!start && section === "upcoming" && iso < today)
        iso = addYears(iso, 1)
    if (!start && section !== "upcoming" && iso > today)
        iso = addYears(iso, -1)
    return iso
}

function placeEvent(section, start, end, today) {
    if (!end) {
        if (start && start > today)
            return "upcoming"
        return "past"
    }
    if (end < today) {
        var ago = -daysBetween(today, end)
        if (isFinite(ago) && ago <= RECENT_DAYS)
            return "completed"
        return "past"
    }
    if (!start || start > today)
        return start ? "upcoming" : "past"
    return "ongoing"
}

function isQualifier(page, name) {
    return /qual|open_qualifier|\boq\d?\b/i.test(page + " " + name)
}

function isStreamer(page, name) {
    return /streamer/i.test(page + " " + name)
}

function parseTicker(wikitext, today) {
    var section = ""
    var events = []
    var lines = String(wikitext).split(/\r?\n/)
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim()
        if (line.indexOf("*") === 0 && line.indexOf("**") !== 0) {
            var heading = line.slice(1).trim().toLowerCase()
            if (heading.indexOf("ongoing") === 0)
                section = "ongoing"
            else if (heading.indexOf("upcoming") === 0)
                section = "upcoming"
            else if (heading.indexOf("completed") === 0)
                section = "completed"
            else
                section = ""
            continue
        }
        if (!section || line.indexOf("**") !== 0)
            continue
        var parts = line.slice(2).split("|")
        var page = (parts[0] || "").trim().replace(/ /g, "_")
        var name = (parts[1] || "").trim() || page.replace(/_/g, " ")
        if (!page || !name)
            continue
        var startMatch = line.match(/startdate=([A-Za-z]{3,9}\s+\d{1,2})/i)
        var endMatch = line.match(/enddate=([A-Za-z]{3,9}\s+\d{1,2})/i)
        var startLabel = startMatch ? startMatch[1] : ""
        var endLabel = endMatch ? endMatch[1] : ""
        var start = resolveStart(monthDay(startLabel), today, section)
        var end = resolveEnd(monthDay(endLabel), start, today, section)
        events.push({
            page: page,
            name: name,
            section: placeEvent(section, start, end, today),
            start: start,
            end: end,
            startLabel: startLabel,
            endLabel: endLabel,
            qualifier: isQualifier(page, name),
            streamer: isStreamer(page, name),
            youtube: ""
        })
    }
    return events
}

function youtubeFromField(raw) {
    var value = String(raw || "").trim()
    if (!value || value.toLowerCase() === "yes")
        return ""
    var handle = value.match(/^@([A-Za-z0-9_.-]+)/)
    if (handle)
        return "https://www.youtube.com/@" + handle[1] + "/live"
    var slashed = value.match(/\/([A-Za-z0-9_-]{11})$/)
    if (slashed)
        return "https://www.youtube.com/watch?v=" + slashed[1]
    if (/^[A-Za-z0-9_-]{11}$/.test(value))
        return "https://www.youtube.com/watch?v=" + value
    if (/^[A-Za-z0-9_.-]+$/.test(value))
        return "https://www.youtube.com/@" + value + "/live"
    return ""
}

function youtubeUrl(wikitext) {
    var parts = String(wikitext).split(/====\s*Streams\s*====/i)
    var streams = parts.length > 1 ? parts[1] : ""
    var primary = streams.match(/youtube1=([^|\n}]+)/i)
    if (primary) {
        var url = youtubeFromField(primary[1])
        if (url)
            return url
    }
    var handle = String(wikitext).match(/youtube=@([A-Za-z0-9_.-]+)/i)
    if (handle)
        return "https://www.youtube.com/@" + handle[1] + "/live"
    var any = String(wikitext).match(/youtube1?=([^|\n}]+)/i)
    return any ? youtubeFromField(any[1]) : ""
}

function words(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(function (word) {
        return word.length > 2
    })
}

function youtubeForLeague(league, events) {
    var leagueWords = {}
    words(league).forEach(function (word) { leagueWords[word] = true })
    var hits = events.filter(function (event) {
        if (!event.youtube)
            return false
        var shared = words(event.name).filter(function (word) { return leagueWords[word] })
        if (shared.length >= 2)
            return true
        var first = words(event.name)[0]
        return Boolean(first && leagueWords[first] && shared.length >= 1)
    })
    var urls = []
    hits.forEach(function (event) {
        if (urls.indexOf(event.youtube) < 0)
            urls.push(event.youtube)
    })
    return urls.length === 1 ? urls[0] : ""
}

function liquipediaHref(page) {
    return "https://liquipedia.net/dota2/" + String(page).split("/").map(encodeURIComponent).join("/")
}

function dateLine(event) {
    if (!event.endLabel || event.endLabel === event.startLabel)
        return event.startLabel
    return event.startLabel + " \u2013 " + event.endLabel
}

function streamOrder(event) {
    var side = event.qualifier || event.streamer ? 2 : 0
    var when = event.section === "ongoing" ? 0 : event.section === "upcoming" ? 1 : event.section === "completed" ? 4 : 8
    return when + side
}

function compareEvents(a, b) {
    var primary = streamOrder(a) - streamOrder(b)
    if (primary)
        return primary
    if (a.section === "completed" || a.section === "past")
        return a.end < b.end ? 1 : a.end > b.end ? -1 : 0
    return a.start < b.start ? -1 : a.start > b.start ? 1 : 0
}

var GENERIC_TOKEN = {
    dota: true,
    dreamleague: true,
    season: true,
    qualifier: true,
    qualifiers: true,
    open: true,
    closed: true,
    league: true,
    cup: true,
    series: true,
    the: true,
    pro: true,
    tournament: true
}

function tokens(value) {
    return String(value).toLowerCase().replace(/(\d+)/g, " $1 ").replace(/[^a-z0-9]+/g, " ").split(" ").filter(function (word) {
        return word.length > 2 || /^\d{2,}$/.test(word)
    })
}

// Steam leaves the score and the viewer count on a lobby after it closes.
// Neither number means the game is still on, and neither does a league
// name that shares a word with something on the calendar.
var LIVE_UPDATE_SECONDS = 8 * 60

function matchIsLive(row, nowSeconds) {
    if (!row)
        return false
    var closed = Number(row.deactivate_time)
    if (isFinite(closed) && closed > 0)
        return false
    var updated = Number(row.last_update_time)
    var now = Number(nowSeconds)
    if (!isFinite(updated) || updated <= 0 || !isFinite(now))
        return false
    var age = now - updated
    if (age < 0)
        age = 0
    return age <= LIVE_UPDATE_SECONDS
}

// A live lobby stays on the desk only when it belongs to an event that is
// still inside its dates. A finished season number does not ride along on
// a newer season that happens to share the word "DreamLeague".
// This does not decide that a lobby is live. matchIsLive does that.
function leagueStillOn(league, events) {
    var leagueTokens = tokens(league)
    var leagueSet = {}
    var leagueNumbers = []
    leagueTokens.forEach(function (word) {
        leagueSet[word] = true
        if (/^\d+$/.test(word))
            leagueNumbers.push(word)
    })
    var matched = []
    for (var i = 0; i < events.length; i++) {
        var event = events[i]
        var eventTokens = tokens(event.name + " " + event.page)
        var shared = []
        for (var t = 0; t < eventTokens.length; t++) {
            if (leagueSet[eventTokens[t]] && shared.indexOf(eventTokens[t]) < 0)
                shared.push(eventTokens[t])
        }
        if (leagueNumbers.length) {
            var numberHit = false
            for (var n = 0; n < leagueNumbers.length; n++) {
                if (shared.indexOf(leagueNumbers[n]) >= 0)
                    numberHit = true
            }
            if (!numberHit)
                continue
        }
        var specific = shared.filter(function (word) { return !GENERIC_TOKEN[word] })
        if (!specific.length)
            continue
        matched.push(event)
    }
    if (!matched.length)
        return true
    for (var m = 0; m < matched.length; m++) {
        if (matched[m].section === "ongoing")
            return true
    }
    return false
}
