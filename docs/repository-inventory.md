# IssuePilot Teknik Özet

Bu teknik özet, sağlanan kaynak dosyalar üzerinden yapılan statik analize dayanmaktadır:

* **Proje Amacı:** GitHub issue, CI/CD hataları ve dokümantasyon eksiklerini analiz ederek, `Agent::Allowed` etiketi ve `Status = Ready` durumu sağlandığında otomatik PR hazırlayan bağımsız bir ajan sistemidir [README.md](../README.md).
* **Ortam Gereksinimleri:** Proje, Node.js 24 LTS sürümünü ve npm paket yöneticisini gerektirir [README.md](../README.md), [package.json](../package.json).
* **Paket Betikleri:** Proje süreci `npm run build` ile TypeScript derlemesini, `npm start` ile CLI uygulamasını ve `npm test` ile test süreçlerini çalıştırır [package.json](../package.json).
* **CI/CD Davranışı:** GitHub Actions üzerinden yürütülen CI süreci, `ubuntu-latest` üzerinde `npm ci` ile bağımlılıkları yükler ve `npm test` komutu ile testleri gerçekleştirir [CI.yml](../.github/workflows/ci.yml).
* **Bağımlılıklar:** Geliştirme ortamında `typescript` ve `@types/node` bağımlılıkları kullanılmaktadır [package.json](../package.json).
* **API ve Yetkilendirme:** Sistem, GitHub REST API üzerinden issue okuma işlemleri yapar; özel repolar için `GH_TOKEN` veya `GITHUB_TOKEN` değişkenlerine ihtiyaç duyar [README.md](../README.md).
* **Çıkış Kodları:** Uygulama, çalışma durumuna göre 0 (uygun), 1 (uygun değil) veya 2 (bağlantı/hata) olmak üzere üç farklı çıkış kodu üretir [README.md](../README.md).

**Sınırlamalar:** Bu analiz, `docs/label-protocol.md`, `docs/implementation-plan.md`, `docs/first-issue.md`, `docs/ai-workflow.md` ve `docs/ready-gate.md` dosyaları kapsam dışı bırakılarak hazırlanmıştır.
