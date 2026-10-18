import { Box, Button, Column, Image, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  padding,
  paddingAll,
  size,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

import type { WaterWidgetProps } from './WaterWidget';

// Il runtime del widget valuta il layout dal sorgente compilato e lì risolve i nomi dei
// componenti e delle variabili: niente alias (tipo `const TapArea = Button`) e niente
// riferimenti a roba fuori dalla funzione, o il widget fallisce ("property taparea does
// not exist"). Quindi: tag <Button>, e `target` — che non è tra le sue props pubbliche e
// che il runtime legge per creare l'azione di tocco che apre l'app (vedi
// plugins/withWidgetExtras.js) — passato con uno spread di un oggetto scritto inline.

// Variante larga (4x2): a sinistra cosa fare oggi, a destra la prossima volta,
// sotto la settimana. Il layout deve restare autonomo (niente import oltre a
// @expo/ui), quindi la matematica delle date è ripetuta da WaterWidget.
const WaterWidgetWide = (props: WaterWidgetProps) => {
  'widget';
  const CARD = '#E6F4EB';
  const INK = '#132A1C';
  const LABEL = '#4E7A5F';
  const DEEP = '#1F7A47';
  const ACCENT = '#2F9E5F';
  const OFF = '#FFFFFF';
  const WEEKDAY = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const MONTH = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  const dueToday = props.days.find((d) => d.day === today)?.count ?? 0;
  const next = props.days.find((d) => d.day > today);
  const inDays = next ? Math.round((next.day - today) / 86400000) : 0;
  const nextDate = next ? new Date(next.day) : null;
  const nextLabel = nextDate ? `${nextDate.getDate()} ${MONTH[nextDate.getMonth()]}` : '';

  const week: { day: number; letter: string; due: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime());
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    week.push({
      day: d.getTime(),
      letter: WEEKDAY[(d.getDay() + 6) % 7],
      due: props.days.some((x) => x.day === d.getTime()),
    });
  }

  return (
    <Button
      {...({ target: 'apri' } as any)}
      modifiers={[fillMaxSize(), paddingAll(16), background(CARD), cornerRadius(24)]}>
    <Column modifiers={[fillMaxSize()]} horizontalAlignment="start">
      <Row verticalAlignment="center">
        <Image
          source={{ uri: 'notification_icon' }}
          tint={DEEP}
          contentDescription={null}
          modifiers={[size(28, 28)]}
        />
        <Spacer modifiers={[width(6)]} />
        <Text style={{ fontSize: 12.5, fontWeight: '600' }} color={LABEL}>
          Annaffiature
        </Text>
      </Row>

      <Row verticalAlignment="center" modifiers={[padding(0, 8, 0, 0)]}>
        {props.total === 0 ? (
          <Text style={{ fontSize: 24, fontWeight: '700' }} color={INK}>
            Nessuna pianta
          </Text>
        ) : dueToday > 0 ? (
          <>
            <Text style={{ fontSize: 36, fontWeight: '700' }} color={DEEP}>
              {String(dueToday)}
            </Text>
            <Column modifiers={[padding(12, 0, 0, 0)]} horizontalAlignment="start">
              <Text style={{ fontSize: 13.5, fontWeight: '600' }} color={INK}>
                {dueToday === 1 ? 'pianta da' : 'piante da'}
              </Text>
              <Text style={{ fontSize: 13.5, fontWeight: '600' }} color={INK}>
                annaffiare oggi
              </Text>
            </Column>
          </>
        ) : (
          <Column horizontalAlignment="start">
            <Text style={{ fontSize: 24, fontWeight: '700' }} color={DEEP}>
              Oggi niente
            </Text>
            <Text style={{ fontSize: 13 }} color={LABEL}>
              tutte in ordine
            </Text>
          </Column>
        )}

        {next ? (
          <>
            <Spacer modifiers={[width(28)]} />
            <Column horizontalAlignment="start">
              <Text style={{ fontSize: 10.5, fontWeight: '600', letterSpacing: 0.5 }} color={LABEL}>
                PROSSIMA
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: '600' }}
                color={INK}
                modifiers={[padding(0, 2, 0, 0)]}>
                {nextLabel}
              </Text>
              <Text style={{ fontSize: 12.5 }} color={LABEL}>
                {`tra ${inDays} ${inDays === 1 ? 'giorno' : 'giorni'}`}
              </Text>
            </Column>
          </>
        ) : null}
      </Row>

      <Text
        style={{ fontSize: 10.5, fontWeight: '600', letterSpacing: 0.5 }}
        color={LABEL}
        modifiers={[padding(0, 12, 0, 0)]}>
        PROSSIMI 7 GIORNI
      </Text>
      <Row modifiers={[padding(0, 4, 0, 0)]}>
        {week.map((w, i) => (
          <Column key={w.day} modifiers={[width(30)]} horizontalAlignment="center">
            <Box
              modifiers={[
                size(11, 11),
                cornerRadius(6),
                background(i === 0 ? DEEP : w.due ? ACCENT : OFF),
              ]}
            />
            <Text
              style={{ fontSize: 10.5, fontWeight: i === 0 ? '700' : '500' }}
              color={i === 0 ? INK : LABEL}
              modifiers={[padding(0, 4, 0, 0)]}>
              {w.letter}
            </Text>
          </Column>
        ))}
      </Row>
    </Column>
    </Button>
  );
};

export default createWidget<WaterWidgetProps>('WaterWidgetWide', WaterWidgetWide, {
  days: [],
  total: 0,
  at: 0,
});
