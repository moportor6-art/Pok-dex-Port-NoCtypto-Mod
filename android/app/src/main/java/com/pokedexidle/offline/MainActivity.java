package com.pokedexidle.offline;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Display;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Pokédex Idle Offline: el juego web corre dentro de un WebView, sin internet.
 * Los archivos se sirven desde https://appassets.androidplatform.net/ (un origen fijo, así la partida
 * guardada en localStorage nunca se pierde). Primero se busca en el parche descargado
 * (files/actualizacion/www) y si no está, en los assets de la APK.
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private File overlay;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }
        highRefresh();
        overlay = PatchGuard.onStart(this);

        web = new WebView(this);
        web.setBackgroundColor(0xFF1B1F3A);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                if (!HOST.equals(r.getUrl().getHost())) return blocked();   // nada sale a internet
                return serve(r.getUrl().getPath());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !HOST.equals(r.getUrl().getHost());   // nunca abre sitios externos
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        setContentView(web);
        immersive();
        web.loadUrl("https://" + HOST + "/index.html");

        // Busca actualizaciones a los 5 segundos (en segundo plano; si no hay internet, no pasa nada)
        handler.postDelayed(() -> new Updater(this).check(false), 5000);
    }

    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "utf-8", 403, "Bloqueado", null, null);
    }

    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html"); MIME.put("js", "application/javascript"); MIME.put("css", "text/css");
        MIME.put("png", "image/png"); MIME.put("gif", "image/gif"); MIME.put("jpg", "image/jpeg");
        MIME.put("webp", "image/webp"); MIME.put("svg", "image/svg+xml"); MIME.put("json", "application/json");
        MIME.put("ogg", "audio/ogg"); MIME.put("mp3", "audio/mpeg"); MIME.put("wav", "audio/wav");
    }

    private WebResourceResponse serve(String path) {
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        if (path.contains("..")) return blocked();
        String rel = path.substring(1);
        String ext = rel.substring(rel.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
        try {
            InputStream in;
            File f = overlay == null ? null : new File(overlay, rel);
            if (f != null && f.isFile()) in = new FileInputStream(f);
            else in = getAssets().open("www/" + rel);
            Map<String, String> h = new HashMap<>();
            h.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mime, mime.startsWith("text") || ext.equals("js") ? "utf-8" : null, 200, "OK", h, in);
        } catch (Exception e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "No encontrado", null, null);
        }
    }

    /** Pide la frecuencia de pantalla más alta (120 Hz donde exista). */
    private void highRefresh() {
        try {
            Display d = Build.VERSION.SDK_INT >= 30 ? getDisplay() : getWindowManager().getDefaultDisplay();
            if (d == null) return;
            Display.Mode cur = d.getMode(), best = cur;
            for (Display.Mode m : d.getSupportedModes())
                if (m.getPhysicalWidth() == cur.getPhysicalWidth() && m.getPhysicalHeight() == cur.getPhysicalHeight()
                        && m.getRefreshRate() > best.getRefreshRate()) best = m;
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.preferredDisplayModeId = best.getModeId();
            getWindow().setAttributes(lp);
        } catch (Exception ignored) {
        }
    }

    @SuppressWarnings("deprecation")
    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.onAndroidBack && window.onAndroidBack()) ? 'si' : 'no'", v -> {
            if (v == null || !v.contains("si")) moveTaskToBack(true);   // sale sin cerrar el juego
        });
    }

    @Override
    protected void onPause() {
        web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'))", null);
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        immersive();
    }

    /** Lo que el juego puede pedirle a la app. */
    final class Bridge {
        @JavascriptInterface public int build() { return BuildInfo.BUILD; }

        @JavascriptInterface public void check() { runOnUiThread(() -> new Updater(MainActivity.this).check(true)); }

        @JavascriptInterface public void history() { runOnUiThread(() -> new Updater(MainActivity.this).history()); }

        /** El juego arrancó bien: el parche queda confirmado. */
        @JavascriptInterface public void ready() { PatchGuard.confirm(MainActivity.this); }
    }

    /** Vuelta atrás automática si un parche no arranca. */
    static final class PatchGuard {
        static File dir(Activity a) { return new File(a.getFilesDir(), "actualizacion"); }

        static File onStart(Activity a) {
            File d = dir(a), www = new File(d, "www"), act = new File(d, "activo.json");
            try {
                if (!act.isFile() || !www.isDirectory()) return null;
                JSONObject o = new JSONObject(Updater.readAll(new FileInputStream(act)));
                if (o.optInt("build") <= BuildInfo.BUILD) { Updater.wipe(d); return null; }   // la APK ya trae algo igual o más nuevo
                if (o.optBoolean("pending")) {
                    int tries = o.optInt("tries") + 1;
                    if (tries > 2) {
                        Updater.wipe(d);
                        //noinspection ResultOfMethodCallIgnored
                        d.mkdirs();
                        write(new File(d, "vuelta_atras.txt"), "La actualización no arrancó bien: se volvió a la versión anterior. Tu partida está intacta.");
                        return null;
                    }
                    o.put("tries", tries);
                    write(act, o.toString());
                }
                return www;
            } catch (Exception e) {
                return null;
            }
        }

        static void confirm(Activity a) {
            File act = new File(dir(a), "activo.json");
            try {
                if (!act.isFile()) return;
                JSONObject o = new JSONObject(Updater.readAll(new FileInputStream(act)));
                if (!o.optBoolean("pending")) return;
                o.put("pending", false);
                o.put("tries", 0);
                write(act, o.toString());
            } catch (Exception ignored) {
            }
        }

        static void write(File f, String s) throws Exception {
            try (OutputStream out = new FileOutputStream(f)) { out.write(s.getBytes("UTF-8")); }
        }
    }
}
