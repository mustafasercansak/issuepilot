# README kurulum görevi

INVENTORY_TASK_KIND değişkeni görev tipini seçer:

- summary (varsayılan): üç kaynak dosyadan yeni bir teknik özet oluşturur.
- readme-setup: mevcut README.md dosyasını koruyup sonuna GitHub Actions ile ilk görev bölümünü ekler.

INVENTORY_ISSUE_NUMBER yetkilendirilmiş tek issue numarasını seçmeye devam eder. Bu genel amaçlı bir kod ajanı veya tüm Ready görevlerini tüketen kuyruk değildir.

README görevi README.md, package.json, docs/ai-workflow.md, docs/ready-gate.md, docs/label-protocol.md, docs/issue-journal.md ve .github/workflows/issue-intake.yml kaynaklarını okur. AI yalnızca eklenecek bölümü üretir. Var olan README içeriği uygulama tarafından değiştirilmeden korunur.

Gerekli secret/variable adları, Node/npm bilgisi, Ready/Allowed durumu, 30 dakikalık tarama ve mevcut belge bağlantıları kontrol edilir. Bilinmeyen kaynak bağlantıları, HTML, resimler, anahtar benzeri metinler ve bilinen npm komutları dışındaki fenced komut örnekleri reddedilir. Bu kontroller metindeki her cümlenin doğruluğunu kanıtlamaz; PR insan tarafından incelenmelidir.

Yeni dal workflow başlangıç commit'inden oluşturulur. README'nin başlangıç içeriği kontrol edilir; GitHub Contents API güncellemesine mevcut blob SHA'sı verilir. Kaydedilmiş README değişikliği tekrar kullanılacaksa checkpoint dosya türü modified olarak doğrulanır. Uygulama kodu veya başka dosya değiştirilmez. Merge yapılmaz.

Günlük, pano geçişleri ve recovery davranışı diğer dokümantasyon göreviyle ortaktır. Eski özet görevini kurtarırken INVENTORY_TASK_KIND=summary seçilmelidir.
