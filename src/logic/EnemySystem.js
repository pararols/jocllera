
// Logic for Enemy Spawning and Movement

export const EnemySystem = {
    // Spawn an enemy at a random edge of the current view or map bounds
    spawnEnemy: (id, mapBounds, targetNodes) => {
        if (!targetNodes || targetNodes.length === 0) return null;

        // Pick a random target from liberated nodes
        const target = targetNodes[Math.floor(Math.random() * targetNodes.length)];

        // Spawn at a random edge relative to the target (simplification)
        // Ideally, we use map bounds, but for now, let's spawn 500-800m away from target
        const angle = Math.random() * Math.PI * 2;
        const distance = 0.005 + Math.random() * 0.002; // Approx 500m in lat/lng degrees (very rough)

        const startLat = target.lat + Math.sin(angle) * distance;
        const startLng = target.lng + Math.cos(angle) * distance;

        return {
            id: id,
            lat: startLat,
            lng: startLng,
            targetId: target.id,
            targetLat: target.lat,
            targetLng: target.lng,
            speed: 0.00003, // Speed per tick
            type: 'suit' // Type of enemy
        };
    },

    // Move enemies towards their targets
    moveEnemies: (enemies) => {
        return enemies.map(enemy => {
            const dx = enemy.targetLat - enemy.lat;
            const dy = enemy.targetLng - enemy.lng;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 0.0001) {
                // Reached target!
                return { ...enemy, reachedTarget: true };
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
