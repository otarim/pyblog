import hashlib

def sign(username):
	s = hashlib.md5()
	s.update('_' + str(id))
	s.update(hashlib.sha1('_misaka').digest())
	return s.hexdigest()[:13]