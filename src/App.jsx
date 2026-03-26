const autoMarkMissed = () => {
    const t = today();
    const allKeys = Object.keys(logs).sort();
    if (!allKeys.length) return;
    const firstKey = allKeys[0];
    const newLogs = { ...logs };
    let changed = false;
    let d = parseKey(firstKey);
    const yesterday = addDays(t, -1);
    while (d <= yesterday) {
      const k = toKey(d);
      if (!newLogs[k]) {
        newLogs[k] = { activity: "missed" };
        changed = true;
      }
      d = addDays(d, 1);
    }
    if (changed) saveLogs(newLogs);
  };
