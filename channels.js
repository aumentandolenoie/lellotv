const channels = [
  {
    id: "skysportf1",
    name: "Sky Sport F1",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Sky_Sport_F1_logo.png/200px-Sky_Sport_F1_logo.png",
    genre: "Sport",
    streams: [
      {
        url: "https://vavoo.to/vavoo-iptv/play/4246774056",
        extractor: true,
        name: "Vavoo",
      },
      {
        url: "https://dlhd.sx/stream/stream-577.php",
        extractor: true,
        name: "DaddyLive",
      },
    ],
  },
  {
    id: "skyuno",
    name: "Sky Uno",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Sky_Sport_F1_logo.png/200px-Sky_Sport_F1_logo.png",
    genre: "Intrattenimento",
    streams: [
      {
        url: "https://vavoo.to/vavoo-iptv/play/2130523218823893ad0255",
        extractor: true,
        name: "Vavoo",
      },
      {
        url: "https://dlhd.sx/stream/stream-881.php",
        extractor: true,
        name: "DaddyLive",
      },
    ],
  },
];

module.exports = channels;
