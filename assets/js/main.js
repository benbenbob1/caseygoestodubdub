var CGTD = CGTD || {};
CGTD.game = new Phaser.Game(800, 120, Phaser.AUTO, 'canvas');

CGTD.game.state.add("preload", CGTD.Preload); //Holds preload + create
CGTD.game.state.add("levelmaster", CGTD.Levels);

CGTD.game.state.start("preload");
