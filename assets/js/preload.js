var CGTD = CGTD || {};

CGTD.Preload = function() {};
CGTD.Preload.prototype = {
	preload: function() {
		this.game.load.spritesheet('casey', 'assets/images/casey.png', 16, 16, 16);
		this.game.load.tilemap('level1', 'assets/map_1-1.json', null,
			Phaser.Tilemap.TILED_JSON);
		this.game.load.image('tiles', 'assets/images/mapitems.png');

		this.game.physics.startSystem(Phaser.Physics.ARCADE);
	},
	create: function() {
	}
}
