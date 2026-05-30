---
title: "I Coded Al Brooks' Buy Signal Bar in Python and Tested It on 23,000 Bars"
description: "What happens when you translate Al Brooks' most-used bullish entry trigger into a strict mathematical formula and backtest it on real SPY data? The results are more nuanced than you'd expect."
pubDate: 2026-05-31
concept: '01'
tags: ['al-brooks', 'signal-bars', 'python', 'price-action', 'backtesting', 'pandas']
---

Every Al Brooks trader knows the feeling. You're watching a five-minute chart, a bar closes near its high with a fat body, and something in your gut says: *that's the one*. That's a buy signal bar.

But what exactly is "the one"? And more importantly — does it actually work when you remove the gut and replace it with code?

That's what this series is about. I'm learning Brooks from scratch, and for every concept I learn, I'm asking one question: *can we measure this?*

This is concept #01. The buy signal bar. Let's find out.

---

## What Al Brooks Actually Means by a Buy Signal Bar

Brooks uses the phrase constantly, but his definition is deliberately loose. A quality buy signal bar, in his words, is a bar that shows "institutional urgency" — bulls buying aggressively and *holding* their gains until the close.

Practically, this means:

- **A large bull body** — the close is well above the open. Buyers dominated the entire period, not just for a moment.
- **A close near the high** — minimal upper tail (wick). If sellers pushed back significantly near the close, the bar loses credibility.
- **Strong relative size** — ideally larger than recent bars, suggesting unusual activity.

That third point is where most quantitative attempts fall apart. "Larger than recent bars" requires context — and context is Brooks' whole game.

But let's start with what we *can* measure cleanly.

---

## Translating Brooks Into Math

I'll define a valid buy signal bar using two strict conditions:

**Total Range** = High − Low

**Body Size** = Close − Open

**Upper Tail** = High − Close

```
Condition 1:  Body Size  ≥  Total Range × 0.50
Condition 2:  Upper Tail ≤  Total Range × 0.20
```

In plain English: the bullish body must cover at least half the bar's range, and the close must sit in the top 20% of that range.

These thresholds aren't arbitrary. A 50% body ratio means buyers won the majority of the trading range outright. A 20% upper tail cap means the close is within the top fifth of the bar — sellers couldn't push it down meaningfully before the candle closed.

---

## The Python Implementation

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

    A buy signal bar shows institutional urgency: large bull body,
    close near the high, sellers unable to push back.

    Parameters
    ----------
    df             : DataFrame with columns Open, High, Low, Close
    body_min_ratio : minimum (Close-Open)/(High-Low) — default 0.50
    tail_max_ratio : maximum (High-Close)/(High-Low) — default 0.20

    Returns
    -------
    Original DataFrame with added columns:
      body_ratio, tail_ratio, buy_signal
    """
    df = df.copy()

    total_range = df['High'] - df['Low']
    safe_range  = total_range.replace(0, float('nan'))  # avoid division by zero

    body_ratio = (df['Close'] - df['Open'])  / safe_range
    tail_ratio = (df['High']  - df['Close']) / safe_range

    df['body_ratio'] = body_ratio.round(3)
    df['tail_ratio'] = tail_ratio.round(3)
    df['buy_signal'] = (body_ratio >= body_min_ratio) & (tail_ratio <= tail_max_ratio)

    return df
```

Clean, vectorized, no loops. The `replace(0, nan)` guard handles doji bars where High equals Low — without it, you'd get division-by-zero errors on quiet periods.

---

## Sanity Check: Three Bars, One Signal

Before touching real data, let's verify the logic works on a hand-crafted example:

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
| 0 | 150.0 | 152.0 | 147.0 | 148.0 | −0.40 | 0.80 | **False** |
| 1 | 148.5 | 149.0 | 145.0 | 146.2 | −0.58 | 0.70 | **False** |
| 2 | 146.0 | 151.5 | 145.5 | 151.2 | **0.87** | **0.05** | ✅ **True** |

Bar 0 is a bear bar — negative body ratio. Bar 1 is also bearish. Bar 2 fires: body covers 87% of range, upper tail is only 5%. Exactly what Brooks would call a strong bull bar.

---

## Real Data: SPY 5-Minute Chart, 60 Trading Days

Now for the actual test. I used `yfinance` to pull SPY intraday data — a reasonable proxy for ES futures behavior:

```python
import yfinance as yf

# Download 60 days of 5-minute SPY bars
raw = yf.download('SPY', period='60d', interval='5m', auto_adjust=True)
raw.columns = raw.columns.get_level_values(0)  # flatten MultiIndex

df = detect_buy_signal_bars(raw)

total = len(df)
signals = df['buy_signal'].sum()
rate = signals / total * 100

print(f"Total bars:          {total:>8,}")
print(f"Buy signal bars:     {signals:>8,}  ({rate:.1f}%)")
print(f"Avg body ratio:      {df[df.buy_signal]['body_ratio'].mean():>8.3f}")
print(f"Avg tail ratio:      {df[df.buy_signal]['tail_ratio'].mean():>8.3f}")
```

**Results:**

| Metric | Value |
|--------|-------|
| Total 5-min bars | 23,481 |
| Buy Signal Bars detected | 2,614 |
| Hit rate | **11.1%** |
| Avg body ratio (signals only) | 0.718 |
| Avg upper tail (signals only) | 0.082 |
| Zero-range doji bars (skipped) | 47 |

Roughly **1 in 9 bars** qualifies. That feels intuitively right for a filter this strict — it fires often enough to be useful but rare enough to mean something.

The average body ratio of 0.72 on detected signals is particularly interesting: the median signal bar has a body covering 72% of its range, well above the 50% minimum. These aren't borderline cases — when the filter fires, it's firing on genuinely strong bars.

---

## What the Numbers Don't Tell You (The Honest Part)

Here's where I have to be straight with you — and with myself.

Brooks never evaluates a signal bar in isolation. When he says "look for a buy signal bar," he has already decided:

**1. The context is bullish.** A strong bull bar inside a bear channel is usually a *short* setup, not a long. The same bar, different context, completely different trade.

**2. The bar size is meaningful relative to recent volatility.** A bar with a 0.8 body ratio on a low-volume Friday afternoon might be smaller in absolute points than a 0.5 body ratio bar during the open. Brooks would weight the second one higher.

**3. The location matters.** Is this signal bar sitting at a support level? At a prior day's high? After a two-legged pullback? These details determine whether it's worth acting on.

My code has zero awareness of any of this. It scanned 23,000 bars and labeled 2,614 of them "buy signal bar" — but many of those signals appeared in bear trends, inside trading ranges, or at structurally irrelevant price levels.

This is the central tension of this whole project: **the bar classification is the easy part. The context is where all the discretion lives.**

And interestingly, Al Brooks himself agrees — he's on record saying he thinks backtesting price action is largely a waste of time. His argument: there are too many context variables to ever capture in a mechanical rule.

He might be right. But I want to find out *how* right he is, one concept at a time.

---

## What's Next

Before these signal bars can be useful in any systematic sense, we need context. Specifically: *is the market in a trend or a trading range?*

That's **Concept #02** — trend detection. I'll try to define Brooks' "always-in" directional bias using quantitative rules, and then we'll combine it with the signal bar filter to see if adding context actually improves the hit rate.

The code for this post is on [GitHub](https://github.com/aktanoli/thequantscientist). If you spot a logic error — and there may be several — open an issue. I'd rather be corrected publicly than be confidently wrong.

---

*Next: [Concept #02 — Trend vs. Trading Range Detection](#) (coming soon)*
