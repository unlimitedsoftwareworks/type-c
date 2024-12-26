export interface HashBucket {
    seed: number; // Seed for secondary hash
    keys: string[]; // Keys in the bucket
}

export interface PerfectHashData {
    primaryTable: number[]; // Maps keys to buckets
    secondaryTable: number[]; // Maps buckets to final indices
    buckets: HashBucket[]; // Metadata about buckets
}

export function generatePerfectHash(fieldIdMap: { [key: string]: number }): PerfectHashData {
    const keys = Object.keys(fieldIdMap);
    const values = Object.values(fieldIdMap);

    const numBuckets = Math.ceil(keys.length * 1.5); // Estimate initial bucket count
    const primaryTable: number[] = Array(numBuckets).fill(-1);
    const buckets: HashBucket[] = Array.from({ length: numBuckets }, () => ({ seed: 0, keys: [] }));

    // Assign keys to buckets using primary hash
    keys.forEach((key) => {
        const bucketIdx = primaryHash(key, numBuckets);
        buckets[bucketIdx].keys.push(key);
        primaryTable[bucketIdx] = bucketIdx; // Map to bucket index
    });

    // Generate secondary hash function for each bucket
    const secondaryTable: number[] = Array(keys.length).fill(-1);
    let currentIndex = 0; // Track position in secondary table

    const MAX_SEED_ATTEMPTS = 1000; // Maximum number of seeds to try

    buckets.forEach((bucket, bucketIdx) => {
        if (bucket.keys.length === 0) return;

        for (let seed = 0; seed < MAX_SEED_ATTEMPTS; seed++) {
            const candidateTable: number[] = Array(bucket.keys.length).fill(-1);
            let success = true;

            for (const key of bucket.keys) {
                const secondaryIdx = secondaryHash(key, seed, bucket.keys.length);
                if (candidateTable[secondaryIdx] !== -1) {
                    success = false; // Collision detected
                    break;
                }
                candidateTable[secondaryIdx] = fieldIdMap[key];
            }

            if (success) {
                buckets[bucketIdx].seed = seed;
                candidateTable.forEach((val, idx) => {
                    secondaryTable[currentIndex + idx] = val;
                });
                currentIndex += bucket.keys.length;
                return; // Stop further seed search for this bucket
            }
        }

        throw new Error(
            `Failed to find a perfect hash for bucket ${bucketIdx} after ${MAX_SEED_ATTEMPTS} attempts`
        );
    });

    return { primaryTable, secondaryTable, buckets };
}

function primaryHash(key: string, numBuckets: number): number {
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash *= 16777619; // FNV prime
        hash >>>= 0; // Ensure unsigned 32-bit
    }
    return hash % numBuckets;
}

function secondaryHash(key: string, seed: number, bucketSize: number): number {
    let hash = seed ^ 2166136261;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash *= 16777619;
        hash >>>= 0;
    }
    return hash % bucketSize;
}