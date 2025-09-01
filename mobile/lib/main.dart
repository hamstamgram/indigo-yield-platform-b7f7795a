import 'dart:io';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

const previewUrl = String.fromEnvironment('PREVIEW_URL', defaultValue: 'https://indigo-yield-platform-v01-i1gh61jyi-hamstamgrams-projects.vercel.app');
final allowedHosts = (const String.fromEnvironment('ALLOWED_APP_DOMAINS', defaultValue: 'vercel.app,indigo-yield.com')).split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();

bool _isAllowed(Uri uri) => allowedHosts.any((host) => uri.host == host || (host.startsWith('*.') && uri.host.endsWith(host.substring(2))) || uri.host.endsWith(host));

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const IndigoApp());
}

class IndigoApp extends StatelessWidget {
  const IndigoApp({super.key});
  @override
  Widget build(BuildContext context) {
    return const MaterialApp(debugShowCheckedModeBanner: false, home: IndigoWebView());
  }
}

class IndigoWebView extends StatefulWidget {
  const IndigoWebView({super.key});
  @override
  State<IndigoWebView> createState() => _IndigoWebViewState();
}

class _IndigoWebViewState extends State<IndigoWebView> {
  late final WebViewController _ctrl;

  @override
  void initState() {
    super.initState();
    final Uri start = Uri.parse(previewUrl);
    _ctrl = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onNavigationRequest: (req) async {
          final uri = Uri.parse(req.url);
          if (uri.scheme == 'mailto' || uri.scheme == 'tel') {
            launchUrl(uri);
            return NavigationDecision.prevent;
          }
          if (_isAllowed(uri)) return NavigationDecision.navigate;
          // Open external links in system
          launchUrl(uri, mode: LaunchMode.externalApplication);
          return NavigationDecision.prevent;
        },
        onHttpAuthRequest: (c, r) async => null,
      ))
      ..loadRequest(start);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: SafeArea(child: WebViewWidget(controller: _ctrl)));
  }
}
