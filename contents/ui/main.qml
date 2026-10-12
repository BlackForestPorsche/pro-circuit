import QtQuick
import QtQuick.Layouts
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PC
import org.kde.kirigami as Kirigami
import "../code/circuit.js" as Circuit

PlasmoidItem {
    id: root

    preferredRepresentation: fullRepresentation
    toolTipMainText: "Pro circuit"
    toolTipSubText: games.length ? games.length + " on now" : "No pro games on"

    property var games: []
    property var events: []
    property bool qualifiers: false
    property string note: ""
    property string today: Circuit.todayIso()
    property var leagueNames: ({})
    property var streamQueue: []
    property var streamKnown: ({})

    readonly property int cardWidth: Kirigami.Units.gridUnit * 16

    compactRepresentation: Item {
        implicitWidth: Kirigami.Units.iconSizes.smallMedium + Kirigami.Units.gridUnit
        implicitHeight: Kirigami.Units.iconSizes.smallMedium

        Kirigami.Icon {
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            width: Kirigami.Units.iconSizes.smallMedium
            height: width
            source: "applications-games"
        }
        PC.Label {
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            text: root.games.length ? String(root.games.length) : ""
            font.bold: true
            color: Kirigami.Theme.highlightColor
        }
        MouseArea {
            anchors.fill: parent
            onClicked: root.expanded = !root.expanded
        }
    }

    fullRepresentation: Item {
        Layout.minimumWidth: Kirigami.Units.gridUnit * 14
        Layout.preferredWidth: Kirigami.Units.gridUnit * 18
        Layout.minimumHeight: Kirigami.Units.gridUnit * 10
        Layout.preferredHeight: Kirigami.Units.gridUnit * 26

        Flickable {
            id: flick
            anchors.fill: parent
            contentWidth: width
            contentHeight: column.implicitHeight + Kirigami.Units.largeSpacing
            clip: true
            boundsBehavior: Flickable.StopAtBounds

            ColumnLayout {
                id: column
                width: flick.width
                spacing: Kirigami.Units.smallSpacing

                RowLayout {
                    Layout.fillWidth: true
                    Layout.leftMargin: Kirigami.Units.smallSpacing
                    Layout.rightMargin: Kirigami.Units.smallSpacing
                    PC.Label {
                        text: "Pro circuit"
                        font.bold: true
                        font.capitalization: Font.AllUppercase
                        Layout.fillWidth: true
                    }
                    PC.ToolButton {
                        text: root.qualifiers ? "Qualifiers on" : "Qualifiers off"
                        checked: root.qualifiers
                        checkable: true
                        onClicked: root.qualifiers = checked
                    }
                }

                PC.Label {
                    visible: root.note.length > 0
                    text: root.note
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                    Layout.leftMargin: Kirigami.Units.smallSpacing
                    Layout.rightMargin: Kirigami.Units.smallSpacing
                    opacity: 0.75
                }

                PC.Label {
                    text: "On now"
                    font.capitalization: Font.AllUppercase
                    opacity: 0.7
                    Layout.leftMargin: Kirigami.Units.smallSpacing
                }

                PC.Label {
                    visible: root.games.length === 0
                    text: "No pro games on right now."
                    opacity: 0.75
                    Layout.leftMargin: Kirigami.Units.smallSpacing
                }

                Repeater {
                    model: root.games
                    delegate: gameCard
                }

                EventBlock {
                    title: "Running"
                    section: "ongoing"
                    limit: 6
                }
                EventBlock {
                    title: "Next"
                    section: "upcoming"
                    limit: 6
                }
                EventBlock {
                    title: "Just finished"
                    section: "completed"
                    limit: 3
                }
            }
        }
    }

    Component {
        id: gameCard
        ColumnLayout {
            required property var modelData
            Layout.fillWidth: true
            Layout.leftMargin: Kirigami.Units.smallSpacing
            Layout.rightMargin: Kirigami.Units.smallSpacing
            spacing: Kirigami.Units.smallSpacing

            Rectangle {
                Layout.fillWidth: true
                implicitHeight: card.implicitHeight + Kirigami.Units.largeSpacing
                radius: Kirigami.Units.smallSpacing
                color: Kirigami.Theme.backgroundColor
                border.color: Kirigami.Theme.highlightColor
                border.width: 1

                ColumnLayout {
                    id: card
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    anchors.margins: Kirigami.Units.smallSpacing
                    spacing: Kirigami.Units.smallSpacing

                    RowLayout {
                        Layout.fillWidth: true
                        Rectangle {
                            width: Kirigami.Units.smallSpacing
                            height: width
                            radius: width
                            color: Kirigami.Theme.highlightColor
                        }
                        PC.Label {
                            text: modelData.league
                            wrapMode: Text.WordWrap
                            font.bold: true
                            color: Kirigami.Theme.highlightColor
                            Layout.fillWidth: true
                        }
                        PC.Label {
                            text: modelData.clock
                            opacity: 0.7
                        }
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        PC.Label {
                            text: modelData.radiant
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                        PC.Label {
                            text: modelData.radiantScore + "  \u2013  " + modelData.direScore
                            font.bold: true
                            font.pixelSize: Kirigami.Theme.defaultFont.pixelSize * 1.4
                        }
                        PC.Label {
                            text: modelData.dire
                            wrapMode: Text.WordWrap
                            horizontalAlignment: Text.AlignRight
                            Layout.fillWidth: true
                        }
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        PC.Label {
                            text: modelData.spectators + " watching"
                            opacity: 0.7
                            Layout.fillWidth: true
                        }
                        PC.Button {
                            visible: modelData.youtube.length > 0
                            text: "Watch"
                            icon.name: "media-playback-start"
                            onClicked: Qt.openUrlExternally(modelData.youtube)
                        }
                    }
                }
            }
        }
    }

    component EventBlock: ColumnLayout {
        property string title: ""
        property string section: ""
        property int limit: 6
        visible: rows.length > 0
        Layout.fillWidth: true
        spacing: 0

        readonly property var rows: {
            var list = []
            for (var i = 0; i < root.events.length && list.length < limit; i++) {
                var event = root.events[i]
                if (event.section !== section)
                    continue
                if (!root.qualifiers && (event.qualifier || event.streamer))
                    continue
                list.push(event)
            }
            return list
        }

        PC.Label {
            text: title
            font.capitalization: Font.AllUppercase
            opacity: 0.7
            Layout.topMargin: Kirigami.Units.largeSpacing
            Layout.leftMargin: Kirigami.Units.smallSpacing
        }

        Repeater {
            model: parent.rows
            delegate: ColumnLayout {
                required property var modelData
                Layout.fillWidth: true
                Layout.leftMargin: Kirigami.Units.smallSpacing
                Layout.rightMargin: Kirigami.Units.smallSpacing
                spacing: Kirigami.Units.smallSpacing

                RowLayout {
                    Layout.fillWidth: true
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 0
                        PC.Label {
                            text: modelData.name
                            wrapMode: Text.WordWrap
                            font.bold: true
                            Layout.fillWidth: true
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: Qt.openUrlExternally(Circuit.liquipediaHref(modelData.page))
                            }
                        }
                        PC.Label {
                            text: Circuit.dateLine(modelData)
                            opacity: 0.7
                        }
                    }
                    PC.Label {
                        text: Circuit.whenLabel(modelData.section, root.today, modelData.start, modelData.end)
                        color: Kirigami.Theme.highlightColor
                    }
                }
                PC.Button {
                    visible: modelData.youtube.length > 0
                    text: "Watch"
                    icon.name: "media-playback-start"
                    onClicked: Qt.openUrlExternally(modelData.youtube)
                }
            }
        }
    }

    Timer {
        interval: 45000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: root.refreshLive()
    }

    Timer {
        interval: 480000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: root.refreshDates()
    }

    Timer {
        id: streamTimer
        interval: 1200
        repeat: true
        running: false
        onTriggered: root.fetchNextStream()
    }

    function request(url, ok, fail) {
        var xhr = new XMLHttpRequest()
        xhr.open("GET", url)
        xhr.setRequestHeader("Accept", "application/json")
        xhr.setRequestHeader("User-Agent", "BlackForestProCircuit/1.0 (KDE Plasma widget; Liquipedia:Tournaments)")
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== XMLHttpRequest.DONE)
                return
            if (xhr.status === 200) {
                try {
                    ok(JSON.parse(xhr.responseText))
                } catch (err) {
                    fail(0)
                }
            } else {
                fail(xhr.status)
            }
        }
        xhr.send()
    }

    function refreshLive() {
        request("https://api.opendota.com/api/live", function (rows) {
            var now = Math.floor(Date.now() / 1000)
            var ids = []
            for (var i = 0; i < rows.length; i++) {
                var id = rows[i].league_id
                if (id > 0 && rows[i].team_name_radiant && rows[i].team_name_dire && Circuit.matchIsLive(rows[i], now) && ids.indexOf(id) < 0)
                    ids.push(id)
            }
            resolveLeagues(ids, 0, function () {
                var next = []
                for (var j = 0; j < rows.length; j++) {
                    var row = rows[j]
                    if (!(row.league_id > 0) || !row.team_name_radiant || !row.team_name_dire)
                        continue
                    if (!Circuit.matchIsLive(row, now))
                        continue
                    var info = root.leagueNames[row.league_id] || { name: "League " + row.league_id, tier: "" }
                    if (info.tier && info.tier !== "professional" && info.tier !== "premium")
                        continue
                    if (!Circuit.leagueStillOn(info.name, root.events))
                        continue
                    next.push({
                        matchId: String(row.match_id || j),
                        league: info.name,
                        radiant: row.team_name_radiant,
                        dire: row.team_name_dire,
                        radiantScore: row.radiant_score || 0,
                        direScore: row.dire_score || 0,
                        spectators: row.spectators || 0,
                        clock: Circuit.formatGameTime(row.game_time),
                        youtube: Circuit.youtubeForLeague(info.name, root.events)
                    })
                }
                next.sort(function (a, b) { return b.spectators - a.spectators })
                root.games = next
                if (root.note.indexOf("live feed") === 0)
                    root.note = ""
            })
        }, function () {
            if (!root.games.length)
                root.note = "The live feed missed."
        })
    }

    function resolveLeagues(ids, index, done) {
        if (index >= ids.length) {
            done()
            return
        }
        var id = ids[index]
        if (root.leagueNames[id]) {
            resolveLeagues(ids, index + 1, done)
            return
        }
        request("https://api.opendota.com/api/leagues/" + id, function (row) {
            var copy = Object.assign({}, root.leagueNames)
            copy[id] = { name: row.name || ("League " + id), tier: row.tier || "" }
            root.leagueNames = copy
            resolveLeagues(ids, index + 1, done)
        }, function () {
            var copy = Object.assign({}, root.leagueNames)
            copy[id] = { name: "League " + id, tier: "" }
            root.leagueNames = copy
            resolveLeagues(ids, index + 1, done)
        })
    }

    function refreshDates() {
        root.today = Circuit.todayIso()
        var url = "https://liquipedia.net/dota2/api.php?action=parse&page=Liquipedia:Tournaments&prop=wikitext&format=json"
        request(url, function (json) {
            var wiki = json.parse && json.parse.wikitext ? json.parse.wikitext["*"] : ""
            var parsed = Circuit.parseTicker(wiki, root.today)
            for (var i = 0; i < parsed.length; i++) {
                if (Object.prototype.hasOwnProperty.call(root.streamKnown, parsed[i].page))
                    parsed[i].youtube = root.streamKnown[parsed[i].page]
            }
            parsed.sort(function (a, b) { return Circuit.compareEvents(a, b) })
            root.events = parsed
            root.note = ""
            var queue = []
            for (var j = 0; j < parsed.length && queue.length < 3; j++) {
                if (!Object.prototype.hasOwnProperty.call(root.streamKnown, parsed[j].page) && parsed[j].section !== "completed" && parsed[j].section !== "past")
                    queue.push(parsed[j].page)
            }
            root.streamQueue = queue
            streamTimer.start()
            root.refreshLive()
        }, function (status) {
            root.note = status === 429
                ? "Liquipedia is busy. Scores still update."
                : "Liquipedia missed. Scores still update."
        })
    }

    function fetchNextStream() {
        if (!root.streamQueue.length) {
            streamTimer.stop()
            return
        }
        var page = root.streamQueue[0]
        root.streamQueue = root.streamQueue.slice(1)
        var url = "https://liquipedia.net/dota2/api.php?action=parse&page=" + encodeURIComponent(page) + "&prop=wikitext&format=json"
        request(url, function (json) {
            var wiki = json.parse && json.parse.wikitext ? json.parse.wikitext["*"] : ""
            var youtube = Circuit.youtubeUrl(wiki)
            var known = Object.assign({}, root.streamKnown)
            known[page] = youtube
            root.streamKnown = known
            var next = []
            for (var i = 0; i < root.events.length; i++) {
                var event = root.events[i]
                if (event.page === page)
                    event = Object.assign({}, event, { youtube: youtube })
                next.push(event)
            }
            root.events = next
            var gamesNext = []
            for (var g = 0; g < root.games.length; g++) {
                var game = root.games[g]
                gamesNext.push(Object.assign({}, game, { youtube: Circuit.youtubeForLeague(game.league, next) }))
            }
            root.games = gamesNext
        }, function () {
            var known = Object.assign({}, root.streamKnown)
            known[page] = ""
            root.streamKnown = known
        })
    }
}
