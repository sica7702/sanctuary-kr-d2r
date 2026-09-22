export function createModelLifecycle(initial = {}) {
  let active = initial.active ?? null;
  let previous = initial.previous ?? null;
  const history = Array.isArray(initial.history)
    ? [...initial.history]
    : [];

  return {
    getState() {
      return {
        active,
        previous,
        history: [...history]
      };
    },

    promote(candidate, metrics = {}) {
      if (!candidate?.modelId) {
        return {
          status: 'rejected',
          reason: 'MODEL_ID_MISSING'
        };
      }

      previous = active;
      active = {
        modelId: candidate.modelId,
        version: candidate.version ?? 'unknown',
        metrics,
        activatedAt: new Date().toISOString()
      };

      history.push({
        action: 'promote',
        modelId: candidate.modelId,
        version: candidate.version ?? 'unknown'
      });

      return {
        status: 'promoted',
        active
      };
    },

    rollback(reason = 'MANUAL_ROLLBACK') {
      if (!previous) {
        return {
          status: 'unavailable',
          reason: 'PREVIOUS_MODEL_MISSING'
        };
      }

      const current = active;
      active = previous;
      previous = current;

      history.push({
        action: 'rollback',
        reason,
        modelId: active?.modelId ?? null
      });

      return {
        status: 'rolled_back',
        active
      };
    }
  };
}
