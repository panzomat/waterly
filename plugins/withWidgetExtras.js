const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// expo-widgets non sa due cose: (a) toccare il widget manda solo un evento a un'app
// già accesa, non apre l'activity; (b) non disegna nulla nel selettore dei widget.
// Questo plugin, registrato in app.json dopo expo-widgets, aggiunge entrambe.
//
// Attenzione: i mod di expo-widgets girano DOPO i nostri (verificato con EXPO_DEBUG),
// quindi non leggiamo né modifichiamo i file che genera. Scriviamo invece risorse
// nostre (piante_*) e dal manifest rimandiamo lì i receiver.
const WIDGETS = [
  {
    name: 'WaterWidget',
    info: 'piante_water_widget_info',
    preview: 'piante_water_widget_preview',
    wide: false,
    minWidth: 110,
    minHeight: 110,
    targetCellWidth: 2,
    targetCellHeight: 2,
    resizeMode: 'horizontal|vertical',
  },
  {
    name: 'WaterWidgetWide',
    info: 'piante_water_widget_wide_info',
    preview: 'piante_water_widget_wide_preview',
    wide: true,
    minWidth: 250,
    minHeight: 110,
    targetCellWidth: 4,
    targetCellHeight: 2,
    resizeMode: 'horizontal|vertical',
  },
];

// Valori duplicati da app.json: se cambi lì dimensioni o resizeMode, aggiornali qui.
const snake = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

// expo.modules.widgets.WIDGET_INTERACTION_ACTION, `internal` nella libreria.
const INTERACTION_ACTION = 'expo.modules.widgets.ACTION_WIDGET_INTERACTION';

// La widget info: quella generata da expo-widgets non si può toccare, quindi ne
// scriviamo una nostra identica + previewLayout, e dal manifest ci puntiamo.
const widgetInfoXml = (widget) => `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
  android:minWidth="${widget.minWidth}dp"
  android:minHeight="${widget.minHeight}dp"
  android:targetCellWidth="${widget.targetCellWidth}"
  android:targetCellHeight="${widget.targetCellHeight}"
  android:updatePeriodMillis="0"
  android:initialLayout="@layout/expo_widgets_initial_layout"
  android:description="@string/${snake(widget.name)}_description"
  android:previewLayout="@layout/${widget.preview}"
  android:resizeMode="${widget.resizeMode}"
  android:widgetCategory="home_screen" />
`;

// Il provider della libreria è `final`, quindi non si può estendere: riscriviamo il
// file generato (il nostro mod gira dopo il loro, quindi vince) aggiungendo l'apertura
// dell'app. Il nome della classe resta invariato, così i widget già piazzati continuano
// a funzionare. Se un giorno la libreria cambia il template, va allineato qui.
const providerKt = (pkg, widget) => `package ${pkg}

import expo.modules.widgets.ExpoWidgetsAppWidgetProvider

class ${widget.name}Provider : ExpoWidgetsAppWidgetProvider(${JSON.stringify(widget.name)}) {
  // Aggiunto da plugins/withWidgetExtras.js: il tocco sul widget apre l'app.
  override fun onReceive(context: android.content.Context, intent: android.content.Intent) {
    super.onReceive(context, intent)
    if (intent.action == "${INTERACTION_ACTION}") {
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
        launch.addFlags(
          android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
        )
        context.startActivity(launch)
      }
    }
  }
}
`;

const CARD_DRAWABLE = `<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#E6F4EB" />
  <corners android:radius="24dp" />
</shape>
`;

const dotDrawable = (color) => `<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
  <solid android:color="${color}" />
</shape>
`;

// Anteprime statiche per il selettore: sono un mock, il selettore non esegue JS.
// shortcut: se cambia il disegno del widget, aggiornare anche queste due anteprime.
const header = (iconSize, labelSize) => `  <LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:gravity="center_vertical">
    <ImageView
      android:layout_width="${iconSize}dp"
      android:layout_height="${iconSize}dp"
      android:src="@drawable/notification_icon"
      android:tint="#1F7A47"
      android:contentDescription="@null" />
    <TextView
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:layout_marginStart="6dp"
      android:text="Annaffiature"
      android:textColor="#4E7A5F"
      android:textSize="${labelSize}sp"
      android:textStyle="bold" />
  </LinearLayout>`;

const dotsRow = (columnWidth, dotSize, letterSize) => `  <LinearLayout
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:orientation="horizontal">
${[
  { text: 'L', kind: 'today' },
  { text: 'M', kind: 'off' },
  { text: 'M', kind: 'on' },
  { text: 'G', kind: 'off' },
  { text: 'V', kind: 'off' },
  { text: 'S', kind: 'on' },
  { text: 'D', kind: 'off' },
]
  .map(
    (d) => `    <LinearLayout
      android:layout_width="${columnWidth}dp"
      android:layout_height="wrap_content"
      android:orientation="vertical"
      android:gravity="center_horizontal">
      <View
        android:layout_width="${dotSize}dp"
        android:layout_height="${dotSize}dp"
        android:background="@drawable/piante_widget_dot_${d.kind}" />
      <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="3dp"
        android:text="${d.text}"
        android:textColor="${d.kind === 'today' ? '#132A1C' : '#4E7A5F'}"
        android:textSize="${letterSize}sp"${d.kind === 'today' ? '\n        android:textStyle="bold"' : ''} />
    </LinearLayout>`
  )
  .join('\n')}
  </LinearLayout>`;

const previewSmall = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:orientation="vertical"
  android:padding="14dp"
  android:background="@drawable/piante_widget_card">
${header(26, 12)}

  <LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="8dp"
    android:orientation="horizontal"
    android:gravity="center_vertical">
    <TextView
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:text="2"
      android:textColor="#1F7A47"
      android:textSize="34sp"
      android:textStyle="bold" />
    <LinearLayout
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:layout_marginStart="10dp"
      android:orientation="vertical">
      <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="piante da"
        android:textColor="#132A1C"
        android:textSize="13sp"
        android:textStyle="bold" />
      <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="annaffiare oggi"
        android:textColor="#132A1C"
        android:textSize="13sp"
        android:textStyle="bold" />
    </LinearLayout>
  </LinearLayout>

  <LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="12dp"
    android:orientation="vertical">
    <TextView
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:text="PROSSIMA"
      android:textColor="#4E7A5F"
      android:textSize="10.5sp"
      android:textStyle="bold"
      android:letterSpacing="0.05" />
    <TextView
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:layout_marginTop="2dp"
      android:text="25 ott &#183; tra 8 giorni"
      android:textColor="#132A1C"
      android:textSize="13.5sp"
      android:textStyle="bold" />
  </LinearLayout>

  <LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="14dp"
    android:orientation="vertical">
${dotsRow(15, 9, 9.5)}
  </LinearLayout>
</LinearLayout>
`;

const previewWide = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:orientation="vertical"
  android:padding="16dp"
  android:background="@drawable/piante_widget_card">
${header(28, 12.5)}

  <LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="8dp"
    android:orientation="horizontal"
    android:gravity="center_vertical">
    <TextView
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:text="2"
      android:textColor="#1F7A47"
      android:textSize="36sp"
      android:textStyle="bold" />
    <LinearLayout
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:layout_marginStart="12dp"
      android:orientation="vertical">
      <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="piante da"
        android:textColor="#132A1C"
        android:textSize="13.5sp"
        android:textStyle="bold" />
      <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="annaffiare oggi"
        android:textColor="#132A1C"
        android:textSize="13.5sp"
        android:textStyle="bold" />
    </LinearLayout>
    <View
      android:layout_width="0dp"
      android:layout_height="1dp"
      android:layout_weight="1" />
    <LinearLayout
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:orientation="vertical">
      <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="PROSSIMA"
        android:textColor="#4E7A5F"
        android:textSize="10.5sp"
        android:textStyle="bold"
        android:letterSpacing="0.05" />
      <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:text="25 ott"
        android:textColor="#132A1C"
        android:textSize="14sp"
        android:textStyle="bold" />
      <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="tra 8 giorni"
        android:textColor="#4E7A5F"
        android:textSize="12.5sp" />
    </LinearLayout>
  </LinearLayout>

  <TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_marginTop="12dp"
    android:text="PROSSIMI 7 GIORNI"
    android:textColor="#4E7A5F"
    android:textSize="10.5sp"
    android:textStyle="bold"
    android:letterSpacing="0.05" />

  <LinearLayout
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_marginTop="4dp"
    android:orientation="vertical">
${dotsRow(30, 11, 10.5)}
  </LinearLayout>
</LinearLayout>
`;

const withWidgetExtras = (config) => {
  // I receiver creati da expo-widgets restano com'erano (stesso nome di classe: i
  // widget già piazzati continuano a funzionare); puntiamo solo la loro widget info
  // alla nostra, che ha l'anteprima. Li riconosciamo dalla meta-data
  // expo.modules.widgets.NAME, perché il nome del receiver è relativo al package.
  config = withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    for (const widget of WIDGETS) {
      const receiver = (app.receiver ?? []).find((r) =>
        (r['meta-data'] ?? []).some(
          (m) =>
            m.$?.['android:name'] === 'expo.modules.widgets.NAME' &&
            m.$?.['android:value'] === widget.name
        )
      );
      if (!receiver) {
        // Ordine inatteso: il receiver non c'è ancora, meglio fermarsi che spedire
        // un widget senza anteprima.
        throw new Error(`withWidgetExtras: receiver del widget ${widget.name} non trovato`);
      }
      const meta = (receiver['meta-data'] ?? []).find(
        (m) => m.$?.['android:name'] === 'android.appwidget.provider'
      );
      if (meta) {
        meta.$['android:resource'] = `@xml/${widget.info}`;
      }
    }
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const pkg = AndroidConfig.Package.getPackage(config);
      const root = config.modRequest.platformProjectRoot;
      const res = path.join(root, 'app/src/main/res');
      const pkgDir = path.join(root, 'app/src/main/java', ...pkg.split('.'));
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.mkdirSync(path.join(res, 'layout'), { recursive: true });
      fs.mkdirSync(path.join(res, 'drawable'), { recursive: true });
      fs.mkdirSync(path.join(res, 'xml'), { recursive: true });

      fs.writeFileSync(path.join(res, 'drawable/piante_widget_card.xml'), CARD_DRAWABLE);
      fs.writeFileSync(path.join(res, 'drawable/piante_widget_dot_on.xml'), dotDrawable('#2F9E5F'));
      fs.writeFileSync(
        path.join(res, 'drawable/piante_widget_dot_today.xml'),
        dotDrawable('#1F7A47')
      );
      fs.writeFileSync(path.join(res, 'drawable/piante_widget_dot_off.xml'), dotDrawable('#FFFFFF'));

      for (const widget of WIDGETS) {
        fs.writeFileSync(
          path.join(pkgDir, `${widget.name}Provider.kt`),
          providerKt(pkg, widget)
        );
        fs.writeFileSync(path.join(res, 'xml', `${widget.info}.xml`), widgetInfoXml(widget));
        fs.writeFileSync(
          path.join(res, 'layout', `${widget.preview}.xml`),
          widget.wide ? previewWide : previewSmall
        );
      }

      return config;
    },
  ]);
};

module.exports = withWidgetExtras;
