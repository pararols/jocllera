// Logic for Enemy Spawning and Movement

export const EnemySystem = {
    // Spawn an enemy near the village approaching a target installation
    spawnEnemy: (id, mapBounds, targetNodes) => {
        if (!targetNodes || targetNodes.length === 0) return null;

        // Pick a random target
        const target = targetNodes[Math.floor(Math.random() * targetNodes.length)];

        // Spawn 120m - 250m away from the target so they are VISIBLE in the village viewport
        const angle = Math.random() * Math.PI * 2;
        const distance = 0.0012 + Math.random() * 0.0015; // ~130m to 280m in lat/lng degrees

        const startLat = target.lat + Math.sin(angle) * distance;
        const startLng = target.lng + Math.cos(angle) * distance;

        return {
            id: id,
            lat: startLat,
            lng: startLng,
            targetId: target.id,
            targetLat: target.lat,
            targetLng: target.lng,
            speed: 0.000045, // Visible, smooth walking speed (~5m/s)
            type: 'suit',
            pressure: 0 // Pressure meter once they reach the target
        };
    },

    // Move enemies towards their targets
    moveEnemies: (enemies) => {
        return enemies.map(enemy => {
            const dx = enemy.targetLat - enemy.lat;
            const dy = enemy.targetLng - enemy.lng;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 0.00015 || enemy.reachedTarget || enemy.isAttacking) {
                // Reached target or actively attacking!
                return {
                    ...enemy,
                    reachedTarget: true,
                    isAttacking: true,
                    lat: enemy.targetLat,
                    lng: enemy.targetLng
                };
            }

            // Normalize and move
            const moveX = (dx / distance) * enemy.speed;
            const moveY = (dy / distance) * enemy.speed;

            return {
                ...enemy,
                lat: enemy.lat + moveX,
                lng: enemy.lng + moveY
            };
        });
    }
};
