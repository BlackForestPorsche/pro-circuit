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

function daysBetween(today, date) {
    var a = Date.parse(today + "T00:00:00Z")
    var b = Date.parse(date + "T00:00:00Z")
    if (!isFinite(a) || !isFinite(b))
        return 0
    return Math.round((b - a) / 86400000)
}

function whenLabel(section, today, start, end) {
    if (section === "completed")
        return "Finished"
    if (section === "ongoing") {
        var left = daysBetween(today, end)
        if (left <= 0)
            return "Ends today"
        if (left === 1)
            return "Ends tomorrow"
        return "Ends in " + left + " days"
    }
    var until = daysBetween(today, start)
    if (until <= 0)
        return "Starts today"
    if (until === 1)
        return "Tomorrow"
    return "In " + until + " days"
}

function toIso(label, today) {
    var match = String(label).trim().match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/)
    if (!match)
        return today
    var month = MONTHS[match[1].slice(0, 3).toLowerCase()]
    if (month === undefined)
        return today
    var day = Number(match[2])
    var year = Number(today.slice(0, 4))
    var todayMonth = Number(today.slice(5, 7)) - 1
    var y = year
    if (month <= 1 && todayMonth >= 9)
        y += 1
    if (month >= 9 && todayMonth <= 1)
        y -= 1
    return y + "-" + pad(month + 1) + "-" + pad(day)
}

function endIso(label, start, today) {
    var iso = toIso(label, today)
    if (iso < start)
        iso = String(Number(iso.slice(0, 4)) + 1) + iso.slice(4)
    return iso
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
        var endLabel = endMatch ? endMatch[1] : startLabel
        var start = startLabel ? toIso(startLabel, today) : today
        var end = endLabel ? endIso(endLabel, start, today) : start
        events.push({
            page: page,
            name: name,
            section: section,
            start: start,
            end: end,
            startLabel: startLabel || start,
            endLabel: endLabel || end,
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
    return event.startLabel + " – " + event.endLabel
}

function streamOrder(event) {
    var side = event.qualifier || event.streamer ? 2 : 0
    var when = event.section === "ongoing" ? 0 : event.section === "upcoming" ? 1 : 4
    return when + side
}
