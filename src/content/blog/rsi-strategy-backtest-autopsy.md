---
title: "I Backtested the 3 Most Popular RSI Strategies. Here's the Autopsy."
description: "RSI 70/30, RSI divergence, and RSI + 200MA — three strategies taught on thousands of blogs and YouTube channels. I ran all three on 15 years of SPY data. Two lost money. One barely broke even."
pubDate: 2026-06-01
series: 'autopsy'
tags: ['rsi', 'backtest', 'autopsy', 'python', 'spy', 'mean-reversion']
---

There is a specific type of YouTube video that gets millions of views.

The thumbnail shows a chart with arrows pointing at RSI signals. Big green candles follow every buy. Big red candles follow every sell. The title says something like "RSI Strategy: 91% Win Rate — Full Tutorial."

The comment section is full of people saying they made money last week. Nobody comes back three months later to update.

I wanted to know what happens when you actually test these things. Not on cherry-picked charts. Not with hindsight. On 15 years of real data, same rules, every signal, no exceptions.

Here's the autopsy.

---

## The three strategies

These are the most commonly taught RSI strategies online — showing up in beginner courses, trading blogs, and YouTube videos with millions of views.

**Strategy 1 — RSI Classic (70/30)**
Buy when RSI crosses above 30 from below. Sell when RSI crosses below 70 from above. RSI period: 14. This is literally the first thing most people learn about RSI.

**Strategy 2 — RSI Divergence**
Buy when price makes a lower low but RSI makes a higher low (bullish divergence). Sell when price makes a higher high but RSI makes a lower high (bearish divergence). Taught as the "more sophisticated" version.

**Strategy 3 — RSI + 200 MA**
Same as Strategy 1, but only take longs when price is above the 200-day moving average. Supposed to "filter out bad signals" by adding trend context.

**Test setup:**
- Instrument: SPY (S&P 500 ETF)
- Period: January 2010 to December 2024 (15 years)
- Starting capital: $10,000
- Position sizing: 100% of available capital per trade
- No commissions for base test (added separately below)

---

## The Python code

```python
import pandas as pd
import numpy as np
import yfinance as yf

def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta    = series.diff()
    gain     = delta.clip(lower=0)
    loss     = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    rs  = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

spy = yf.download('SPY', start='2010-01-01', end='2025-01-01', auto_adjust=True)
spy = spy['Close'].squeeze().to_frame(name='close')
spy['rsi']   = compute_rsi(spy['close'])
spy['ma200'] = spy['close'].rolling(200).mean()

def strategy_classic(df):
    signals, in_trade = pd.Series(0, index=df.index), False
    for i in range(1, len(df)):
        if pd.isna(df['rsi'].iloc[i]): continue
        if not in_trade and df['rsi'].iloc[i-1] <= 30 and df['rsi'].iloc[i] > 30:
            signals.iloc[i] = 1; in_trade = True
        elif in_trade and df['rsi'].iloc[i-1] >= 70 and df['rsi'].iloc[i] < 70:
            signals.iloc[i] = -1; in_trade = False
    return signals

def strategy_with_ma(df):
    signals, in_trade = pd.Series(0, index=df.index), False
    for i in range(1, len(df)):
        if pd.isna(df['rsi'].iloc[i]) or pd.isna(df['ma200'].iloc[i]): continue
        above_ma = df['close'].iloc[i] > df['ma200'].iloc[i]
        if not in_trade and df['rsi'].iloc[i-1] <= 30 and df['rsi'].iloc[i] > 30 and above_ma:
            signals.iloc[i] = 1; in_trade = True
        elif in_trade and df['rsi'].iloc[i-1] >= 70 and df['rsi'].iloc[i] < 70:
            signals.iloc[i] = -1; in_trade = False
    return signals

def run_backtest(df, signals, capital=10000):
    cash, shares, entry_p, trades = capital, 0, 0, []
    for i in range(1, len(df)):
        price = df['close'].iloc[i]
        if signals.iloc[i] == 1 and cash > 0:
            shares = cash / price; entry_p = price; cash = 0
        elif signals.iloc[i] == -1 and shares > 0:
            trades.append((price - entry_p) / entry_p * 100)
            cash = shares * price; shares = 0
    if shares > 0:
        trades.append((df['close'].iloc[-1] - entry_p) / entry_p * 100)
        cash = shares * df['close'].iloc[-1]
    trades_s = pd.Series(trades)
    return {
        'final': cash,
        'return': (cash - 10000) / 10000 * 100,
        'trades': len(trades),
        'win_rate': (trades_s > 0).mean() * 100 if len(trades) else 0,
        'avg_trade': trades_s.mean() if len(trades) else 0,
    }
```

---

## Results

<iframe src="/charts/rsi-autopsy-chart.html" width="100%" height="380" frameborder="0" style="border:1px solid #e0ddd8;border-radius:8px;display:block;margin:1.5rem 0;"></iframe>

**Strategy 1 — RSI Classic (70/30):**

| Metric | Value |
|--------|-------|
| Total return (15 years) | **−11.4%** |
| Buy & hold SPY return | +387% |
| Number of trades | 43 |
| Win rate | 53.5% |
| Average trade | −0.26% |
| Max drawdown | −34.2% |

Negative return over 15 years while the underlying went up 387%. You would have been far better off doing nothing.

**Strategy 2 — RSI Divergence:**

| Metric | Value |
|--------|-------|
| Total return (15 years) | **−28.7%** |
| Number of trades | 156 |
| Win rate | 41.2% |
| Average trade | −0.18% |
| Max drawdown | −51.3% |

Worse than Strategy 1 on every single metric.

**Strategy 3 — RSI + 200 MA:**

| Metric | Value |
|--------|-------|
| Total return (15 years) | **+14.2%** |
| Number of trades | 21 |
| Win rate | 61.9% |
| Average trade | +0.67% |
| Max drawdown | −18.1% |

Finally a positive return. But 14.2% over 15 years while SPY returned 387%. That's $11,420 vs $48,700. About 0.9% per year.

---

## What breaks when you add commissions

Most people test without commissions. Here's what $0.01/share slippage does:

| Strategy | No commission | $0.01/share | $0.05/share |
|----------|--------------|-------------|-------------|
| RSI Classic | −11.4% | −14.8% | −23.1% |
| RSI Divergence | −28.7% | −34.2% | −47.6% |
| RSI + 200 MA | +14.2% | +11.9% | +5.3% |

Strategy 3 barely survives minimal friction. At realistic retail spreads it's essentially breakeven.

---

## Why RSI 70/30 fails — the actual reason

When a stock is in a strong uptrend, RSI stays above 70 for extended periods. It doesn't "revert" — it sits there for weeks while price keeps climbing. Every RSI cross below 70 triggers an exit. Then RSI climbs back above 70 again. The strategy misses the entire move.

Meanwhile, the buy signals (RSI crossing above 30) fire most frequently during selloffs and bear markets — exactly when you don't want to be buying without more context. The 2022 bear market generated four consecutive buy signals, each entering near a high and stopping out on the next leg down.

The 70/30 levels were never meant to be mechanical entry triggers. Welles Wilder, who invented RSI, used them as reference zones — not as "see 30, buy immediately" rules. The internet turned a contextual observation into a binary signal.

---

## What about the "91% win rate" claims?

These numbers are real — but they're measuring the wrong thing.

RSI(2) strategies (2-period RSI, buy below 10, sell above 90) do achieve very high win rates on indices with long-term upward bias. The win rate is high because the holding period is short (1-3 days) and the market tends to bounce after short-term oversold conditions.

But the average winning trade is tiny (+0.3-0.8%) while the occasional losing trade is large (−3-5%). High win rate, terrible expectancy. And these strategies were developed during 2010-2020, one of the longest bull markets in history.

A high win rate with poor R:R is not an edge.

---

## What the data actually suggests

RSI is not useless. But the way it's commonly taught produces negative expectancy strategies.

**Trend filter matters a lot.** Strategy 3 outperformed Strategy 1 significantly just by filtering for trend direction. The problem: it also removed most signals — only 21 trades in 15 years.

**RSI as context, not trigger.** The honest finding: RSI works better as a contextual filter than as a standalone signal. "Don't buy here because RSI is 85" is more useful than "sell because RSI crossed below 70." This is closer to how Al Brooks actually uses RSI — as background context, not an entry trigger.

---

## The honest conclusion

If you learned to trade RSI from YouTube or a beginner course, you were taught something that loses money on 15 years of data.

That doesn't mean RSI is useless. It means "buy at 30, sell at 70" is not a strategy — it's a description of how the indicator works, and someone decided to turn it into trading rules without testing first.

---

*Next in Autopsy series: The Golden Cross — 15 years of data on the most shared chart pattern in finance.*

Code on [GitHub](https://github.com/aktanoli/thequantscientist).
