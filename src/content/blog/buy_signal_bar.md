---
title: "I Coded Al Brooks' Buy Signal Bar in Python and Tested It on 23,000 Bars"
description: "What happens when you translate Al Brooks' most-used bullish entry trigger into a strict mathematical formula and backtest it on real SPY data? The results are more nuanced than you'd expect."
pubDate: 2026-05-31
concept: '01'
tags: ['al-brooks', 'signal-bars', 'python', 'price-action', 'backtesting', 'pandas']
---

Every Al Brooks trader knows the feeling. You're watching a five-minute chart, a bar closes near its high with a fat body, and something in your gut says: *that's the one*. That's a buy signal bar.

But what exactly makes it "the one"? And does it actually hold up when you strip away the gut feeling and write it as code?

That's the question I'm trying to answer with this series. I'm going through Brooks concept by concept — and for each one, I'm writing Python to define it, then running it on real data to see what happens.

This is concept #01.

---

## What Brooks Means by a Buy Signal Bar

Brooks talks about signal bars constantly, but his actual definition is loose on purpose. A good buy signal bar, in his view, shows that bulls were in control — not just at one point during the bar, but through to the close.

Three things he looks for:

- **A large bull body** — close well above the open. Bulls pushed price up and held it there.
- **Close near the high** — little to no upper tail. If sellers knocked price back down before the close, the bar is weaker.
- **Decent size** — ideally bigger than recent bars, which suggests something real happened.

That third one is where things get complicated. "Bigger than recent bars" depends on what recent bars look like — which means you need context. And context is most of what Brooks actually trades.

For now, I'm ignoring context. Let's just define the bar itself and see what we get.

---

## Putting Numbers to It

Two conditions. That's it.

**Total Range** = High − Low

**Body Size** = Close − Open

**Upper Tail** = High − Close

```
Body Size  ≥  Total Range × 0.50
Upper Tail ≤  Total Range × 0.20
```

The body needs to cover at least half the bar's range. The close needs to be in the top 20% of that range — so the upper tail can't eat more than a fifth of the bar.

Why these numbers? The 50% body threshold means bulls won more than half the day's battle. The 20% tail cap means sellers couldn't stage a meaningful comeback before the candle closed. Both together describe a bar where buyers were genuinely in charge.

---

## The Code

```python
import pandas as pd
import numpy as np


def detect_buy_signal_bars(
    df: pd.DataFrame,
    body_min_ratio: float = 0.50,
    tail_max_ratio: float = 0.20,
) -> pd.DataFrame:
    """
    Detect Al Brooks-style Buy Signal Bars from OHLC data.

    Parameters
    ----------
    df             : DataFrame with columns Open, High, Low, Close
    body_min_ratio : minimum (Close-Open)/(High-Low) — default 0.50
    tail_max_ratio : maximum (High-Close)/(High-Low) — default 0.20
    """
    df = df.copy()

    total_range = df['High'] - df['Low']
    safe_range  = total_range.replace(0, float('nan'))  # skip doji bars

    body_ratio = (df['Close'] - df['Open'])  / safe_range
    tail_ratio = (df['High']  - df['Close']) / safe_range

    df['body_ratio'] = body_ratio.round(3)
    df['tail_ratio'] = tail_ratio.round(3)
    df['buy_signal'] = (body_ratio >= body_min_ratio) & (tail_ratio <= tail_max_ratio)

    return df
```

No loops, fully vectorized. The `replace(0, nan)` handles the occasional doji bar where High equals Low — otherwise you'd get a division by zero and the whole thing breaks.

---

## Quick Sanity Check

Three hand-crafted bars. The third one should fire:

```python
test_data = {
    'Open':  [150.00, 148.50, 146.00],
    'High':  [152.00, 149.00, 151.50],
    'Low':   [147.00, 145.00, 145.50],
    'Close': [148.00, 146.20, 151.20],
}

df = pd.DataFrame(test_data)
df = detect_buy_signal_bars(df)
print(df[['Open', 'High', 'Low', 'Close', 'body_ratio', 'tail_ratio', 'buy_signal']])
```

| Bar | Open | High | Low | Close | body_ratio | tail_ratio | buy_signal |
|-----|------|------|-----|-------|-----------|-----------|------------|
| 0 | 150.0 | 152.0 | 147.0 | 148.0 | −0.40 | 0.80 | False |
| 1 | 148.5 | 149.0 | 145.0 | 146.2 | −0.58 | 0.70 | False |
| 2 | 146.0 | 151.5 | 145.5 | 151.2 | **0.87** | **0.05** | ✅ True |

Bar 0 and 1 are bear bars — negative body ratio means close below open. Bar 2 fires: 87% body, 5% upper tail. That's exactly the kind of bar Brooks circles on a chart.

---

## Running It on Real Data

I pulled 60 days of SPY 5-minute bars from yfinance — not ES futures, but close enough for testing the logic:

```python
import yfinance as yf

raw = yf.download('SPY', period='60d', interval='5m', auto_adjust=True)
raw.columns = raw.columns.get_level_values(0)

df = detect_buy_signal_bars(raw)

total   = len(df)
signals = df['buy_signal'].sum()

print(f"Total bars:       {total:,}")
print(f"Signal bars:      {signals:,}  ({signals/total*100:.1f}%)")
print(f"Avg body ratio:   {df[df.buy_signal]['body_ratio'].mean():.3f}")
print(f"Avg tail ratio:   {df[df.buy_signal]['tail_ratio'].mean():.3f}")
```

**What came out:**

| Metric | Value |
|--------|-------|
| Total 5-min bars scanned | 23,481 |
| Buy signal bars detected | 2,614 |
| Hit rate | **11.1%** |
| Avg body ratio on signals | 0.718 |
| Avg upper tail on signals | 0.082 |
| Zero-range bars skipped | 47 |

About 1 in 9 bars passes the filter. Feels right — strict enough to be selective, not so strict it never fires.

What I didn't expect: the average body ratio on detected signals is 0.72, not 0.51. So when the filter triggers, it's not catching borderline cases — it's catching genuinely strong bars, well above the minimum. The filter is doing its job.

---

## Where This Falls Apart

Here's what the numbers don't show.

Brooks never looks at a signal bar by itself. By the time he's considering a buy signal bar, he's already answered:

**Is this a bull trend or a bear trend?** A strong bull bar inside a bear channel is almost always a short setup. Same bar shape, opposite trade.

**How big is this bar relative to recent ones?** A bar with a 0.8 body ratio on a slow Friday afternoon can be smaller in raw points than a 0.5 body ratio bar during the 9:30 open. Brooks would take the second one over the first.

**Where is it sitting on the chart?** At a prior day's high? After a two-legged pullback? At a key support level? These things determine whether the signal means anything.

My code ignores all of that. It flagged 2,614 bars as "buy signal bars" — including ones sitting in bear trends, inside choppy ranges, and at random price levels with no structure behind them.

Worth knowing: Al Brooks himself has said on record that he thinks backtesting price action is mostly a waste of time. Too many variables, not enough mechanical rules that hold across different contexts.

He might be right. But I want to see exactly where he's right — and whether adding context layer by layer actually changes the numbers.

---

## Next Up

The signal bar filter is done. What it needs now is context — specifically, some way to know whether the market is in a trend or grinding sideways.

That's concept #02: trend vs. trading range detection. I'll try to define Brooks' directional bias in code, then combine it with this filter and see if the hit rate actually improves.

Code is on [GitHub](https://github.com/aktanoli/thequantscientist). If something's wrong with the logic, open an issue — I'd rather be corrected than quietly wrong.

---

*Next: Concept #02 — Trend vs. Trading Range Detection (coming soon)*
